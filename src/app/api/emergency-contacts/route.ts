import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/emergency-contacts ───
// Query params: student_id (required)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const student_id = searchParams.get('student_id');
  if (!student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 });

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_emergency_contacts')
    .select('*')
    .eq('student_id', Number(student_id))
    .order('escalation_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/emergency-contacts ───
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

  const { student_id, contact_full_name, relationship, primary_phone, secondary_phone, email, escalation_order, authorized_to_collect } = body;

  if (!student_id || !contact_full_name?.trim() || !relationship?.trim() || !primary_phone?.trim()) {
    return NextResponse.json({ error: 'student_id, contact_full_name, relationship, and primary_phone are required' }, { status: 400 });
  }

  if (escalation_order < 1 || escalation_order > 5) {
    return NextResponse.json({ error: 'escalation_order must be between 1 and 5' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_emergency_contacts')
    .insert([{
      student_id: Number(student_id),
      contact_full_name: contact_full_name.trim(),
      relationship: relationship.trim(),
      primary_phone: primary_phone.trim(),
      secondary_phone: secondary_phone?.trim() || null,
      email: email?.trim() || null,
      escalation_order: Number(escalation_order) || 1,
      authorized_to_collect: authorized_to_collect === true || authorized_to_collect === 'true',
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/clinic/visits ───
// Query params: term_id, student_id
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal', 'Teacher', 'Receptionist'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const term_id = searchParams.get('term_id');
  const student_id = searchParams.get('student_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_clinic_visits')
    .select(`
      *,
      school_students (
        id,
        first_name,
        last_name,
        admission_number,
        admission_no
      )
    `)
    .order('visit_date', { ascending: false });

  if (term_id) query = query.eq('term_id', Number(term_id));
  if (student_id) query = query.eq('student_id', Number(student_id));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/clinic/visits ───
// Restrict to Admin/Receptionist
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const writeRoles = ['Admin', 'Receptionist'];
  if (!writeRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Receptionist role required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    student_id,
    visit_date,
    complaint,
    diagnosis,
    treatment,
    medication_given,
    temperature,
    blood_pressure,
    pulse_rate,
    weight,
    height,
    referred_to,
    notes,
    term_id,
    attended_by,
  } = body;

  if (!student_id || !complaint || !term_id) {
    return NextResponse.json({ error: 'student_id, complaint, and term_id are required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const insertData: any = {
    student_id: Number(student_id),
    visit_date: visit_date || new Date().toISOString().split('T')[0],
    complaint: complaint.trim(),
    diagnosis: diagnosis?.trim() || null,
    treatment: treatment?.trim() || null,
    medication_given: medication_given?.trim() || null,
    temperature: temperature != null ? Number(temperature) : null,
    blood_pressure: blood_pressure?.trim() || null,
    pulse_rate: pulse_rate != null ? Number(pulse_rate) : null,
    weight: weight != null ? Number(weight) : null,
    height: height != null ? Number(height) : null,
    referred_to: referred_to?.trim() || null,
    notes: notes?.trim() || null,
    term_id: Number(term_id),
    attended_by: attended_by ? Number(attended_by) : session.id,
    discharged: false,
  };

  const { data, error } = await supabase
    .from('school_clinic_visits')
    .insert([insertData])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Default tenant ID — override via env in production
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';

// ─── POST /api/admissions/apply ───
// Public endpoint — no auth required
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    student_first_name,
    student_last_name,
    student_middle_name,
    date_of_birth,
    gender,
    previous_school,
    kcpe_index_number,
    kcpe_total_marks,
    guardian_full_name,
    guardian_phone,
    guardian_email,
    guardian_national_id,
    form_applied_for,
  } = body;

  // ─── Required field validation ───
  const missing: string[] = [];
  if (!student_first_name?.trim()) missing.push('student_first_name');
  if (!student_last_name?.trim()) missing.push('student_last_name');
  if (!date_of_birth) missing.push('date_of_birth');
  if (!gender) missing.push('gender');
  if (!kcpe_index_number?.trim()) missing.push('kcpe_index_number');
  if (!guardian_full_name?.trim()) missing.push('guardian_full_name');
  if (!guardian_phone?.trim()) missing.push('guardian_phone');
  if (!guardian_national_id?.trim()) missing.push('guardian_national_id');
  if (!form_applied_for) missing.push('form_applied_for');

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(', ')}` },
      { status: 400 }
    );
  }

  if (kcpe_total_marks !== undefined && kcpe_total_marks !== null) {
    const marks = Number(kcpe_total_marks);
    if (isNaN(marks) || marks < 0 || marks > 500) {
      return NextResponse.json({ error: 'kcpe_total_marks must be between 0 and 500' }, { status: 400 });
    }
  }

  const supabase = getServiceClient();

  // ─── Duplicate check: same tenant + KCPE index ───
  const { data: existing } = await supabase
    .from('school_admission_applications')
    .select('id, reference_number')
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .eq('kcpe_index_number', kcpe_index_number.trim())
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: 'Duplicate application: an application with this KCPE index number already exists.' },
      { status: 409 }
    );
  }

  // ─── Generate reference number: ADM-YYYY-XXXXXX ───
  const currentYear = new Date().getFullYear();
  const yearStart = `${currentYear}-01-01T00:00:00.000Z`;
  const yearEnd = `${currentYear}-12-31T23:59:59.999Z`;

  const { count: existingCount } = await supabase
    .from('school_admission_applications')
    .select('id', { count: 'exact', head: true })
    .gte('submitted_at', yearStart)
    .lte('submitted_at', yearEnd);

  const seq = (existingCount ?? 0) + 1;
  const reference_number = `ADM-${currentYear}-${String(seq).padStart(6, '0')}`;

  // ─── Insert application ───
  const { data, error } = await supabase
    .from('school_admission_applications')
    .insert([{
      tenant_id: DEFAULT_TENANT_ID,
      reference_number,
      student_first_name: student_first_name.trim(),
      student_middle_name: student_middle_name?.trim() || null,
      student_last_name: student_last_name.trim(),
      date_of_birth,
      gender,
      previous_school: previous_school?.trim() || null,
      kcpe_index_number: kcpe_index_number.trim(),
      kcpe_total_marks: kcpe_total_marks !== undefined && kcpe_total_marks !== null ? Number(kcpe_total_marks) : null,
      form_applied_for: Number(form_applied_for),
      guardian_full_name: guardian_full_name.trim(),
      guardian_phone: guardian_phone.trim(),
      guardian_email: guardian_email?.trim() || null,
      guardian_national_id: guardian_national_id.trim(),
      status: 'Submitted',
      submitted_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    // Handle race condition on unique constraint
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Duplicate application: an application with this KCPE index number already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ─── Send SMS to guardian (best-effort) ───
  try {
    const studentName = `${student_first_name.trim()} ${student_last_name.trim()}`;
    const smsMessage = `Dear ${guardian_full_name.trim()}, your admission application for ${studentName} has been received. Reference: ${reference_number}. - APSIMS`;

    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: guardian_phone.trim(), message: smsMessage }),
    });

    // Mark SMS as sent
    await supabase
      .from('school_admission_applications')
      .update({ sms_sent: true })
      .eq('id', data.id);
  } catch {
    // SMS failure should not block the response
  }

  return NextResponse.json({ reference_number, status: 'Submitted' }, { status: 201 });
}

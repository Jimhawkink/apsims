export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const SECRET         = process.env.OTP_SECRET || 'apsims-otp-2026-xK9mP3qR';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const MIN_AGE        = 10;
const MAX_AGE        = 22;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function verifyToken(token: string, phone: string): boolean {
  try {
    const decoded  = Buffer.from(token, 'base64url').toString('utf8');
    const [tPhone, tsStr, sig] = decoded.split('|');
    if (tPhone !== phone) return false;
    const ts = Number(tsStr);
    if (isNaN(ts) || Date.now() - ts > 30 * 60 * 1000) return false;
    const h = createHmac('sha256', SECRET);
    h.update(`verified:${phone}:${ts}`);
    return h.digest('hex') === sig;
  } catch { return false; }
}

function getAge(dob: string): number {
  const born = new Date(dob); const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
  return age;
}

function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown';
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    // Student Basic
    student_first_name, student_last_name, student_middle_name,
    date_of_birth, gender, nationality,
    // Location
    county, sub_county, village_estate,
    // Academic
    form_applied_for, previous_school, previous_school_county,
    kcpe_index_number, kcpe_total_marks, kcpe_year,
    // Guardian
    guardian_full_name, guardian_phone, guardian_alt_phone,
    guardian_email, guardian_national_id, guardian_relationship,
    guardian_occupation, guardian_county,
    // Emergency contact
    emergency_name, emergency_phone, emergency_relationship,
    // Medical
    blood_group, has_disability, disability_details, allergies, medical_conditions,
    // Documents
    photo_url, birth_cert_url, kcpe_slip_url, other_doc_url, other_doc_name,
    // Verification
    verification_token, honeypot, terms_agreed,
  } = body;

  // Honeypot
  if (honeypot && String(honeypot).trim() !== '') {
    return NextResponse.json({ reference_number: 'BOT-0000-000000', status: 'Submitted' }, { status: 201 });
  }

  // Terms
  if (!terms_agreed) {
    return NextResponse.json({ error: 'You must agree to the terms and declaration.' }, { status: 400 });
  }

  // OTP verification
  const cleanPhone = (guardian_phone || '').replace(/\s+/g, '').trim();
  if (!verification_token || !verifyToken(String(verification_token), cleanPhone)) {
    return NextResponse.json({ error: 'Phone not verified. Please complete email OTP verification.' }, { status: 403 });
  }

  // Required fields
  const missing: string[] = [];
  if (!student_first_name?.trim())  missing.push('First name');
  if (!student_last_name?.trim())   missing.push('Last name');
  if (!date_of_birth)               missing.push('Date of birth');
  if (!gender)                      missing.push('Gender');
  if (!form_applied_for)            missing.push('Form applied for');
  if (!guardian_full_name?.trim())  missing.push('Guardian name');
  if (!cleanPhone)                  missing.push('Guardian phone');
  if (missing.length) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
  }

  // Age check
  if (date_of_birth) {
    const a = getAge(date_of_birth);
    if (a < MIN_AGE || a > MAX_AGE) {
      return NextResponse.json({ error: `Student age must be between ${MIN_AGE} and ${MAX_AGE} years.` }, { status: 400 });
    }
  }

  const supabase = getServiceClient();
  const ip = getIP(req);
  const kcpeClean = (kcpe_index_number || '').replace(/\s+/g, '').toUpperCase().trim();

  // Duplicate KCPE check
  if (kcpeClean) {
    const { data: existing } = await supabase
      .from('school_admission_applications')
      .select('id, reference_number')
      .eq('kcpe_index_number', kcpeClean)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        error: `An application for KCPE index ${kcpeClean} already exists (Ref: ${existing.reference_number}). Contact the school if this is an error.`
      }, { status: 409 });
    }
  }

  // Generate reference number
  const yearNow = new Date().getFullYear();
  const yearStart = `${yearNow}-01-01T00:00:00Z`;
  const yearEnd   = `${yearNow}-12-31T23:59:59Z`;
  const { count: existingCount } = await supabase
    .from('school_admission_applications')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', yearStart)
    .lte('created_at', yearEnd);
  const seq = (existingCount ?? 0) + 1;
  const reference_number = `ADM-${yearNow}-${String(seq).padStart(6, '0')}`;

  // Insert
  const { data, error } = await supabase
    .from('school_admission_applications')
    .insert([{
      tenant_id:              DEFAULT_TENANT,
      reference_number,
      // Student
      student_first_name:     student_first_name.trim(),
      student_middle_name:    student_middle_name?.trim() || null,
      student_last_name:      student_last_name.trim(),
      date_of_birth,
      gender,
      nationality:            nationality || 'Kenyan',
      // Location
      county:                 county?.trim() || null,
      sub_county:             sub_county?.trim() || null,
      village_estate:         village_estate?.trim() || null,
      // Academic
      form_applied_for:       Number(form_applied_for),
      previous_school:        previous_school?.trim() || null,
      previous_school_county: previous_school_county?.trim() || null,
      kcpe_index_number:      kcpeClean || null,
      kcpe_total_marks:       kcpe_total_marks ? Number(kcpe_total_marks) : null,
      kcpe_year:              kcpe_year ? Number(kcpe_year) : null,
      // Guardian
      guardian_full_name:     guardian_full_name.trim(),
      guardian_relationship:  guardian_relationship || 'Parent',
      guardian_phone:         cleanPhone,
      guardian_alt_phone:     guardian_alt_phone?.trim() || null,
      guardian_email:         guardian_email?.trim() || null,
      guardian_national_id:   guardian_national_id?.trim() || null,
      guardian_occupation:    guardian_occupation?.trim() || null,
      guardian_county:        guardian_county?.trim() || null,
      // Emergency
      emergency_name:         emergency_name?.trim() || null,
      emergency_phone:        emergency_phone?.trim() || null,
      emergency_relationship: emergency_relationship?.trim() || null,
      // Medical
      blood_group:            blood_group || null,
      has_disability:         has_disability || false,
      disability_details:     disability_details?.trim() || null,
      allergies:              allergies?.trim() || null,
      medical_conditions:     medical_conditions?.trim() || null,
      // Documents
      photo_url:              photo_url || null,
      birth_cert_url:         birth_cert_url || null,
      kcpe_slip_url:          kcpe_slip_url || null,
      other_doc_url:          other_doc_url || null,
      other_doc_name:         other_doc_name?.trim() || null,
      // Status
      status:                 'Submitted',
      phone_verified:         true,
      email_verified:         true,
      terms_agreed:           true,
      submitter_ip:           ip,
      submitted_at:           new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Duplicate application: KCPE index already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Confirmation SMS (non-blocking)
  try {
    const name = `${student_first_name.trim()} ${student_last_name.trim()}`;
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        message: `Dear ${guardian_full_name.trim()}, your admission application for ${name} has been received. Ref: ${reference_number}. Track at apsims.vercel.app/admissions/status - APSIMS School`,
      }),
    });
    await supabase.from('school_admission_applications').update({ sms_sent: true }).eq('id', data.id);
  } catch { /* SMS failure is non-blocking */ }

  return NextResponse.json({ reference_number, status: 'Submitted' }, { status: 201 });
}

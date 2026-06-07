import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

const SECRET         = process.env.OTP_SECRET || 'apsims-otp-2026-xK9mP3qR';
const DEFAULT_TENANT = process.env.DEFAULT_TENANT_ID || '00000000-0000-0000-0000-000000000001';
const MAX_PER_PHONE  = 3;   // max applications per phone per year
const MAX_PER_IP     = 10;  // max applications per IP per day
const MIN_AGE        = 10;  // youngest acceptable student
const MAX_AGE        = 22;  // oldest acceptable student

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Verify the phone OTP token issued by /api/admissions/verify-otp ──────────
function verifyToken(token: string, phone: string): boolean {
  try {
    const decoded  = Buffer.from(token, 'base64url').toString('utf8');
    const [tPhone, tsStr, sig] = decoded.split('|');
    if (tPhone !== phone) return false;
    const ts = Number(tsStr);
    if (isNaN(ts) || Date.now() - ts > 30 * 60 * 1000) return false; // 30-min expiry
    const h = createHmac('sha256', SECRET);
    h.update(`verified:${phone}:${ts}`);
    return h.digest('hex') === sig;
  } catch { return false; }
}

// ── Compute rough age from DOB ────────────────────────────────────────────────
function getAge(dob: string): number {
  const born = new Date(dob);
  const now  = new Date();
  let age = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) age--;
  return age;
}

// ── GET client IP from headers ────────────────────────────────────────────────
function getIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         req.headers.get('x-real-ip') || 'unknown';
}

// ─── POST /api/admissions/apply ───────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    student_first_name, student_last_name, student_middle_name,
    date_of_birth, gender, previous_school,
    kcpe_index_number, kcpe_total_marks,
    guardian_full_name, guardian_phone, guardian_email, guardian_national_id,
    form_applied_for,
    verification_token,    // ← OTP-verified token
    honeypot,              // ← must be empty/absent
    terms_agreed,          // ← must be true
  } = body;

  // ── LAYER 1: Honeypot — bots fill this, humans don't ─────────────────────
  if (honeypot && String(honeypot).trim() !== '') {
    // Silent fail — don't tell bots we caught them
    return NextResponse.json({ reference_number: 'BOT-0000-000000', status: 'Submitted' }, { status: 201 });
  }

  // ── LAYER 2: Terms must be agreed ─────────────────────────────────────────
  if (!terms_agreed) {
    return NextResponse.json({ error: 'You must agree to the terms and declaration to submit.' }, { status: 400 });
  }

  // ── LAYER 3: OTP Token verification ───────────────────────────────────────
  const cleanPhone = (guardian_phone || '').replace(/\s+/g, '').trim();
  if (!verification_token || !verifyToken(String(verification_token), cleanPhone)) {
    return NextResponse.json({ error: 'Phone number not verified. Please complete OTP verification.' }, { status: 403 });
  }

  // ── LAYER 4: Required fields ───────────────────────────────────────────────
  const missing: string[] = [];
  if (!student_first_name?.trim())   missing.push('First name');
  if (!student_last_name?.trim())    missing.push('Last name');
  if (!date_of_birth)                missing.push('Date of birth');
  if (!gender)                       missing.push('Gender');
  if (!kcpe_index_number?.trim())    missing.push('KCPE index number');
  if (!guardian_full_name?.trim())   missing.push('Guardian name');
  if (!cleanPhone)                   missing.push('Guardian phone');
  if (!guardian_national_id?.trim()) missing.push('Guardian National ID');
  if (!form_applied_for)             missing.push('Form applied for');
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 });
  }

  // ── LAYER 4b: Format validations ──────────────────────────────────────────
  // Kenya mobile numbers: Safaricom 07xx, Airtel 073x/010x, Telkom 077x/011x
  // Valid: 070-079, 010, 011 (after country prefix stripping)
  const KENYA_PHONE_RE = /^(\+254|0)(7\d{8}|1[01]\d{7})$/;
  if (!KENYA_PHONE_RE.test(cleanPhone)) {
    return NextResponse.json({
      error: 'Invalid Kenyan phone number. Valid formats: 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, +2541XXXXXXXX'
    }, { status: 400 });
  }
  const kcpeClean = kcpe_index_number.trim().replace(/\s+/g, '');
  if (!/^\d{11,12}$/.test(kcpeClean)) {
    return NextResponse.json({ error: 'KCPE index number must be 11–12 digits (e.g. 10100101001).' }, { status: 400 });
  }
  const idClean = guardian_national_id.trim().replace(/\s+/g, '');
  if (!/^\d{7,8}$/.test(idClean)) {
    return NextResponse.json({ error: 'Guardian National ID must be 7–8 digits.' }, { status: 400 });
  }
  if (![1, 2, 3, 4, 10, 11, 12].includes(Number(form_applied_for))) {
    return NextResponse.json({ error: 'Form applied for must be Form 1-4 (8-4-4) or Grade 10-12 (CBC).' }, { status: 400 });
  }
  if (kcpe_total_marks !== undefined && kcpe_total_marks !== null) {
    const m = Number(kcpe_total_marks);
    if (isNaN(m) || m < 100 || m > 500) {
      return NextResponse.json({ error: 'KCPE marks must be between 100 and 500.' }, { status: 400 });
    }
  }

  // ── LAYER 5: Age validation ────────────────────────────────────────────────
  const age = getAge(date_of_birth);
  if (age < MIN_AGE || age > MAX_AGE) {
    return NextResponse.json({
      error: `Student age (${age}) is outside the valid range (${MIN_AGE}–${MAX_AGE} years). Please check the date of birth.`
    }, { status: 400 });
  }

  const supabase = getServiceClient();
  const ip       = getIP(req);
  const yearNow  = new Date().getFullYear();
  const yearStart = `${yearNow}-01-01T00:00:00.000Z`;
  const yearEnd   = `${yearNow}-12-31T23:59:59.999Z`;

  // ── LAYER 6a: Phone duplicate check — block same phone + same form ──────────
  // Siblings sharing a parent phone are allowed IF they apply for different forms/grades
  const { data: existingByPhone } = await supabase
    .from('school_admission_applications')
    .select('id, form_applied_for')
    .eq('guardian_phone', cleanPhone)
    .gte('submitted_at', yearStart)
    .lte('submitted_at', yearEnd);

  const existingApps = existingByPhone || [];

  // Hard block: exact same phone + exact same form = duplicate application
  const sameFormApp = existingApps.find(a => Number(a.form_applied_for) === Number(form_applied_for));
  if (sameFormApp) {
    const formLabels: Record<number, string> = { 1: 'Form 1', 2: 'Form 2', 3: 'Form 3', 4: 'Form 4', 10: 'Grade 10', 11: 'Grade 11', 12: 'Grade 12' };
    return NextResponse.json({
      error: `An application for ${formLabels[Number(form_applied_for)] || `Form ${form_applied_for}`} using this phone number already exists this year. If you are a different sibling, please apply for a different form/grade.`
    }, { status: 409 });
  }

  // Soft limit: same phone used across too many different forms (family max)
  if (existingApps.length >= MAX_PER_PHONE) {
    return NextResponse.json({
      error: `This phone number has reached the maximum of ${MAX_PER_PHONE} applications this year. Contact the school office directly for assistance.`
    }, { status: 429 });
  }

  // ── LAYER 6b: IP rate limit — max 10 per IP per day ──────────────────────
  if (ip !== 'unknown') {
    const today = new Date().toISOString().split('T')[0];
    const { count: ipCount } = await supabase
      .from('school_admission_applications')
      .select('id', { count: 'exact', head: true })
      .eq('submitter_ip', ip)
      .gte('submitted_at', `${today}T00:00:00.000Z`)
      .lte('submitted_at', `${today}T23:59:59.999Z`);

    if ((ipCount ?? 0) >= MAX_PER_IP) {
      return NextResponse.json({
        error: 'Too many applications submitted from your location today. Please try again tomorrow or contact the school.'
      }, { status: 429 });
    }
  }

  // ── Duplicate check: same KCPE index ──────────────────────────────────────
  const { data: existing } = await supabase
    .from('school_admission_applications')
    .select('id, reference_number')
    .eq('tenant_id', DEFAULT_TENANT)
    .eq('kcpe_index_number', kcpeClean)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      error: `An application for KCPE index ${kcpeClean} already exists (Ref: ${existing.reference_number}). Contact the school if this is an error.`
    }, { status: 409 });
  }

  // ── Generate reference number ──────────────────────────────────────────────
  const { count: existingCount } = await supabase
    .from('school_admission_applications')
    .select('id', { count: 'exact', head: true })
    .gte('submitted_at', yearStart)
    .lte('submitted_at', yearEnd);

  const seq = (existingCount ?? 0) + 1;
  const reference_number = `ADM-${yearNow}-${String(seq).padStart(6, '0')}`;

  // ── Insert application ─────────────────────────────────────────────────────
  const { data, error } = await supabase
    .from('school_admission_applications')
    .insert([{
      tenant_id:           DEFAULT_TENANT,
      reference_number,
      student_first_name:  student_first_name.trim(),
      student_middle_name: student_middle_name?.trim() || null,
      student_last_name:   student_last_name.trim(),
      date_of_birth,
      gender,
      previous_school:     previous_school?.trim() || null,
      kcpe_index_number:   kcpeClean,
      kcpe_total_marks:    kcpe_total_marks !== undefined && kcpe_total_marks !== null ? Number(kcpe_total_marks) : null,
      form_applied_for:    Number(form_applied_for),
      guardian_full_name:  guardian_full_name.trim(),
      guardian_phone:      cleanPhone,
      guardian_email:      guardian_email?.trim() || null,
      guardian_national_id: idClean,
      status:              'Submitted',
      submitted_at:        new Date().toISOString(),
      submitter_ip:        ip,
      phone_verified:      true,
    }])
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Duplicate application: KCPE index already exists.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Send confirmation SMS ──────────────────────────────────────────────────
  try {
    const name = `${student_first_name.trim()} ${student_last_name.trim()}`;
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: cleanPhone,
        message: `Dear ${guardian_full_name.trim()}, your admission application for ${name} has been received. Ref: ${reference_number}. Track status at apsims.vercel.app/admissions/status - APSIMS School`,
      }),
    });
    await supabase.from('school_admission_applications').update({ sms_sent: true }).eq('id', data.id);
  } catch { /* SMS failure is non-blocking */ }

  return NextResponse.json({ reference_number, status: 'Submitted' }, { status: 201 });
}

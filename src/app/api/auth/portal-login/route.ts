export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, isBcryptHash, hashPassword, setSessionCookie, checkRateLimit, recordFailedAttempt, clearFailedAttempts, auditLog } from '@/lib/auth';

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

function getServiceClient() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

  // ─── Rate Limiting ───
  const { allowed, retryAfterMs } = checkRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${Math.ceil(retryAfterMs / 60000)} minutes.` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) } }
    );
  }

  // ─── Parse Input ───
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { username, password } = body;
  if (!username?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  // ─── Lookup Portal User ───
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('school_portal_users')
    .select('*, school_students(id, first_name, last_name, admission_number, form_id, status, school_forms(id, form_name)), school_teachers(id, first_name, last_name, tsc_number)')
    .ilike('username', username.trim())
    .eq('is_active', true)
    .single();

  if (error || !data) {
    recordFailedAttempt(ip);
    await auditLog({ action: 'portal_login_failed', details: { username: username.trim(), reason: 'not_found' }, ip_address: ip });
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // ─── Verify Password ───
  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) {
    recordFailedAttempt(ip);
    await auditLog({ action: 'portal_login_failed', actor_name: data.username, details: { reason: 'wrong_password' }, ip_address: ip });
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // ─── Use service role for write operations (bypasses RLS) ───
  const svc = getServiceClient();

  // ─── Auto-upgrade plaintext passwords to bcrypt ───
  if (!isBcryptHash(data.password_hash)) {
    const newHash = await hashPassword(password);
    await svc.from('school_portal_users').update({ password_hash: newHash }).eq('id', data.id);
  }

  // ─── Clear rate limit on success ───
  clearFailedAttempts(ip);

  // ─── Update last login ───
  await svc.from('school_portal_users').update({
    last_login: new Date().toISOString(),
    login_count: (data.login_count || 0) + 1,
  }).eq('id', data.id);

  // ─── Log activity ───
  await svc.from('school_portal_activity_logs').insert([{
    portal_user_id: data.id,
    action: 'login',
    details: { user_type: data.user_type },
  }]);

  // ─── Set httpOnly session cookie ───
  const sessionData = {
    id: data.id,
    username: data.username,
    full_name: data.full_name || data.username,
    role: data.user_type,
    user_type: data.user_type,
    user_type_portal: data.user_type as 'student' | 'parent' | 'teacher',
    student_id: data.linked_student_id,
    teacher_id: data.linked_teacher_id,
  };

  await setSessionCookie(sessionData);

  // ─── Audit Log ───
  await auditLog({
    action: 'portal_login_success',
    actor_id: data.id,
    actor_name: data.username,
    actor_role: data.user_type,
    ip_address: ip,
  });

  return NextResponse.json({
    success: true,
    user: sessionData,
    student: data.school_students,
    teacher: data.school_teachers,
  });
}

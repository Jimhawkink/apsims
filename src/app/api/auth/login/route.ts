import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, isBcryptHash, hashPassword, setSessionCookie, clearSession, checkRateLimit, recordFailedAttempt, clearFailedAttempts, auditLog } from '@/lib/auth';

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
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

  // ─── Lookup User ───
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('school_users')
    .select('*')
    .ilike('username', username.trim())
    .eq('is_active', true)
    .single();

  if (error || !data) {
    recordFailedAttempt(ip);
    await auditLog({ action: 'login_failed', details: { username: username.trim(), reason: 'not_found' }, ip_address: ip });
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // ─── Verify Password ───
  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) {
    // Remove hardcoded backdoor — no admin123 bypass
    recordFailedAttempt(ip);
    await auditLog({ action: 'login_failed', actor_name: data.username, details: { reason: 'wrong_password' }, ip_address: ip });
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // ─── Auto-upgrade plaintext passwords to bcrypt ───
  if (!isBcryptHash(data.password_hash)) {
    const newHash = await hashPassword(password);
    await supabase.from('school_users').update({ password_hash: newHash }).eq('id', data.id);
  }

  // ─── Clear rate limit on success ───
  clearFailedAttempts(ip);

  // ─── Update last login ───
  await supabase.from('school_users').update({ last_login: new Date().toISOString() }).eq('id', data.id);

  // ─── Set httpOnly session cookie ───
  const sessionData = {
    id: data.id,
    username: data.username,
    full_name: data.full_name,
    role: data.role,
    user_type: data.user_type || data.role,
    email: data.email,
    phone: data.phone,
    permissions: data.permissions || {},
  };

  await setSessionCookie(sessionData);

  // ─── Audit Log ───
  await auditLog({
    action: 'login_success',
    actor_id: data.id,
    actor_name: data.username,
    actor_role: data.role,
    ip_address: ip,
  });

  return NextResponse.json({ success: true, user: sessionData });
}

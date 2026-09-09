export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, isBcryptHash, hashPassword, setSessionCookie, checkRateLimit, recordFailedAttempt, clearFailedAttempts, auditLog } from '@/lib/auth';

function getSupabase() {
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';

  // ─── Parse Input FIRST ───
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const username = body?.username?.trim() || '';
  const password = body?.password?.trim() || '';

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  // ─── Rate Limiting by IP AND by username ───
  // Prevents brute force AND password-spraying via IP rotation / VPN
  const ipKey = `ip:${ip}`;
  const userKey = `user:${username.toLowerCase()}`;

  const { allowed: ipAllowed, retryAfterMs: ipRetry } = checkRateLimit(ipKey);
  if (!ipAllowed) {
    return NextResponse.json(
      { error: `Too many attempts from your network. Try again in ${Math.ceil(ipRetry / 60000)} min.` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(ipRetry / 1000)) } }
    );
  }
  const { allowed: userAllowed, retryAfterMs: userRetry } = checkRateLimit(userKey);
  if (!userAllowed) {
    return NextResponse.json(
      { error: `Account locked. Try again in ${Math.ceil(userRetry / 60000)} min.` },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(userRetry / 1000)) } }
    );
  }

  // ─── Lookup User ───
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('school_users')
    .select('*')
    .ilike('username', username)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    recordFailedAttempt(ipKey);
    recordFailedAttempt(userKey);
    await auditLog({ action: 'login_failed', details: { username, reason: 'not_found' }, ip_address: ip });
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // ─── Verify Password ───
  const isValid = await verifyPassword(password, data.password_hash);
  if (!isValid) {
    recordFailedAttempt(ipKey);
    recordFailedAttempt(userKey);
    await auditLog({ action: 'login_failed', actor_name: data.username, details: { reason: 'wrong_password' }, ip_address: ip });
    return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
  }

  // ─── Auto-upgrade plaintext passwords to bcrypt ───
  if (!isBcryptHash(data.password_hash)) {
    const newHash = await hashPassword(password);
    await supabase.from('school_users').update({ password_hash: newHash }).eq('id', data.id);
  }

  // ─── Clear rate limits on success ───
  clearFailedAttempts(ipKey);
  clearFailedAttempts(userKey);

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

  // ─── Audit Log success ───
  await auditLog({
    action: 'login_success',
    actor_id: data.id,
    actor_name: data.username,
    actor_role: data.role,
    ip_address: ip,
  });

  return NextResponse.json({ success: true, user: sessionData });
}



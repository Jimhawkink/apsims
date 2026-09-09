import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SALT_ROUNDS = 12;
const SESSION_COOKIE = 'alpha_session';
const CSRF_COOKIE = 'alpha_csrf';

// ─── Password Hashing ───

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Support both bcrypt hashes and legacy plaintext
  if (hash.startsWith('$2')) {
    return bcrypt.compare(plain, hash);
  }
  // Legacy plaintext — auto-upgrade on next login
  return plain === hash;
}

export function isBcryptHash(hash: string): boolean {
  return hash.startsWith('$2');
}

// ─── Session (httpOnly Cookie) ───

export interface SessionData {
  id: number;
  username: string;
  full_name: string;
  role: string;
  user_type: string;
  email?: string;
  phone?: string;
  permissions?: Record<string, boolean>;
  // Portal session fields
  user_type_portal?: 'student' | 'parent' | 'teacher';
  student_id?: number;
  teacher_id?: number;
}

// ✅ REAL HMAC-SHA256 — cryptographically secure, not forgeable
function getSecret(): string {
  return process.env.SESSION_SECRET || 'alpha-school-CHANGE-ME-in-production-min32chars!!';
}

function signPayload(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export function encodeSession(data: SessionData): string {
  const payload = JSON.stringify({ ...data, _ts: Date.now() });
  const b64 = Buffer.from(payload).toString('base64url');
  const sig = signPayload(b64);
  return `${b64}.${sig}`;
}

export function decodeSession(token: string): SessionData | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx < 0) return null;
    const b64 = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    // Constant-time comparison to prevent timing attacks
    const expectedSig = signPayload(b64);
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;
    // Decode and check expiry (8 hours rolling — tighter for security)
    const json = Buffer.from(b64, 'base64url').toString();
    const payload = JSON.parse(json);
    const { _ts, ...data } = payload;
    if (Date.now() - _ts > 8 * 60 * 60 * 1000) return null; // 8hr session
    return data as SessionData;
  } catch {
    return null;
  }
}

// ─── Cookie Helpers (server-side only) ───

export async function setSessionCookie(data: SessionData) {
  const token = encodeSession(data);
  const cookieStore = await cookies();
  const SEVEN_DAYS = 60 * 60 * 24 * 7; // 7 days in seconds
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  });
  // Set CSRF token
  const csrf = generateCsrfToken();
  cookieStore.set(CSRF_COOKIE, csrf, {
    httpOnly: false, // JS needs to read this for headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SEVEN_DAYS,
    path: '/',
  });
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  cookieStore.delete(CSRF_COOKIE);
}

// ─── CSRF ───

function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  // Use crypto if available
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < 32; i++) array[i] = Math.floor(Math.random() * 256);
  }
  return Buffer.from(array).toString('hex');
}

export async function validateCsrf(token: string | null): Promise<boolean> {
  if (!token) return false;
  const cookieStore = await cookies();
  const csrf = cookieStore.get(CSRF_COOKIE)?.value;
  return token === csrf;
}

// ─── Rate Limiting (per-IP + per-username, in-memory) ───
// Exponential lockout: 5 attempts=15min, 10=60min, 20+=24hr

interface RateEntry { count: number; lockedUntil: number; }
const loginAttempts = new Map<string, RateEntry>();

function getLockoutMs(count: number): number {
  if (count >= 20) return 24 * 60 * 60 * 1000;     // 24 hours
  if (count >= 10) return 60 * 60 * 1000;            // 1 hour
  if (count >= 5)  return 15 * 60 * 1000;            // 15 minutes
  return 0;
}

export function checkRateLimit(key: string): { allowed: boolean; retryAfterMs: number } {
  const entry = loginAttempts.get(key);
  if (!entry) return { allowed: true, retryAfterMs: 0 };
  if (entry.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() };
  }
  // Clear expired lockout
  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(key);
    return { allowed: true, retryAfterMs: 0 };
  }
  return { allowed: true, retryAfterMs: 0 };
}

export function recordFailedAttempt(key: string) {
  const entry = loginAttempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count++;
  const lockMs = getLockoutMs(entry.count);
  if (lockMs > 0) entry.lockedUntil = Date.now() + lockMs;
  loginAttempts.set(key, entry);
}

export function clearFailedAttempts(key: string) {
  loginAttempts.delete(key);
}

// ─── Audit Logging ───

export async function auditLog(params: {
  action: string;
  actor_id?: number;
  actor_name?: string;
  actor_role?: string;
  target_type?: string;
  target_id?: number | string;
  details?: any;
  ip_address?: string;
}) {
  try {
    // Use service role for reliable logging
    const { createClient } = await import('@supabase/supabase-js');
    const serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await serviceClient.from('school_audit_log').insert([{
      action: params.action,
      actor_id: params.actor_id,
      actor_name: params.actor_name,
      actor_role: params.actor_role,
      target_type: params.target_type,
      target_id: params.target_id,
      details: params.details,
      ip_address: params.ip_address,
      created_at: new Date().toISOString(),
    }]);
  } catch {
    // Audit logging should never crash the app — silently fail
    // Consider logging to file as fallback
  }
}

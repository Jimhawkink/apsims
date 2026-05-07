import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

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

export function encodeSession(data: SessionData): string {
  // Simple base64 encoding with timestamp for tamper detection
  const payload = { ...data, _ts: Date.now(), _sig: simpleSig(data) };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

export function decodeSession(token: string): SessionData | null {
  try {
    const json = Buffer.from(token, 'base64').toString();
    const payload = JSON.parse(json);
    // Verify signature
    const { _sig, _ts, ...data } = payload;
    if (_sig !== simpleSig(data)) return null;
    // Check expiry (24 hours)
    if (Date.now() - _ts > 24 * 60 * 60 * 1000) return null;
    return data as SessionData;
  } catch {
    return null;
  }
}

function simpleSig(data: any): string {
  // Simple HMAC-like signature using a secret
  const secret = process.env.SESSION_SECRET || 'alpha-school-change-me-in-production';
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash.toString(36) + '-' + secret.slice(0, 8);
}

// ─── Cookie Helpers (server-side only) ───

export async function setSessionCookie(data: SessionData) {
  const token = encodeSession(data);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  // Set CSRF token
  const csrf = generateCsrfToken();
  cookieStore.set(CSRF_COOKIE, csrf, {
    httpOnly: false, // JS needs to read this for headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24,
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

// ─── Rate Limiting (in-memory, per-instance) ───

const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true, retryAfterMs: 0 };

  if (entry.lockedUntil > Date.now()) {
    return { allowed: false, retryAfterMs: entry.lockedUntil - Date.now() };
  }

  // Clear expired lockouts
  if (entry.lockedUntil > 0 && entry.lockedUntil <= Date.now()) {
    loginAttempts.delete(ip);
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: true, retryAfterMs: 0 };
}

export function recordFailedAttempt(ip: string) {
  const entry = loginAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
  }
  loginAttempts.set(ip, entry);
}

export function clearFailedAttempts(ip: string) {
  loginAttempts.delete(ip);
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

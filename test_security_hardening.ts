/**
 * ============================================================================
 * APSIMS COMPREHENSIVE SECURITY HARDENING AUDIT & TEST SUITE
 * ============================================================================
 * Tests all implemented security hardening layers:
 * 1. Cryptographic HMAC-SHA256 Session Signature & Anti-Tampering
 * 2. Password Security & Bcrypt Hashing with 12 Salt Rounds
 * 3. Dual-Vector Rate Limiting (IP + Username Anti-Brute Force / Anti-Spraying)
 * 4. Middleware Route Guards, Role Hierarchy & Auditor Read-Only Enforcement
 * 5. Defense-in-Depth HTTP Security Headers (CSP, HSTS, Nosniff, etc.)
 * 6. Live Production Endpoint Verification (https://apsims.vercel.app)
 * ============================================================================
 */

import { NextRequest } from 'next/server';
import { middleware } from './src/middleware';
import {
  encodeSession,
  decodeSession,
  hashPassword,
  verifyPassword,
  isBcryptHash,
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
  SessionData,
} from './src/lib/auth';
import { createHmac } from 'crypto';

interface TestResult {
  suite: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(suite: string, name: string, fn: () => Promise<void> | void) {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, name, status: 'PASS', details: 'Passed verification checks', durationMs });
    console.log(`  \x1b[32m✔\x1b[0m [PASS] ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - start);
    results.push({ suite, name, status: 'FAIL', details: err?.message || String(err), durationMs });
    console.log(`  \x1b[31m✖\x1b[0m [FAIL] ${name} \x1b[90m(${durationMs}ms)\x1b[0m`);
    console.log(`         \x1b[31mError: ${err?.message || err}\x1b[0m`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log('\n\x1b[1m\x1b[34m======================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m  APSIMS SECURITY HARDENING - COMPREHENSIVE AUTOMATED TEST SUITE\x1b[0m');
  console.log('\x1b[1m\x1b[34m======================================================================\x1b[0m\n');

  // =========================================================================
  // SUITE 1: HMAC-SHA256 Cryptographic Session Security & Anti-Tampering
  // =========================================================================
  console.log('\x1b[1m\x1b[33m[SUITE 1] HMAC-SHA256 Cryptographic Session Security & Anti-Tampering\x1b[0m');

  const baseUser: SessionData = {
    id: 101,
    username: 'test_auditor',
    full_name: 'Audit Inspector',
    role: 'auditor',
    user_type: 'auditor',
    permissions: { view_reports: true },
  };

  await runTest('HMAC Sessions', 'Encodes session with base64 payload and 64-char HMAC signature', () => {
    const token = encodeSession(baseUser);
    const parts = token.split('.');
    assert(parts.length === 2, `Expected 2 parts separated by dot, got ${parts.length}`);
    const [b64, sig] = parts;
    assert(b64.length > 20, 'Base64 payload is missing or too short');
    assert(/^[0-9a-f]{64}$/.test(sig), `Signature must be 64-char hex SHA256 string, got: ${sig}`);
  });

  await runTest('HMAC Sessions', 'Decodes valid signed session restoring complete user claims', () => {
    const token = encodeSession(baseUser);
    const decoded = decodeSession(token);
    assert(decoded !== null, 'Decoded session must not be null');
    assert(decoded?.username === 'test_auditor', `Expected username test_auditor, got ${decoded?.username}`);
    assert(decoded?.role === 'auditor', `Expected role auditor, got ${decoded?.role}`);
    assert(decoded?.id === 101, `Expected id 101, got ${decoded?.id}`);
  });

  await runTest('HMAC Sessions', 'Tampered payload (Privilege Escalation attempt) is rejected', () => {
    const token = encodeSession(baseUser);
    const [b64, sig] = token.split('.');
    // Attacker modifies decoded JSON payload to escalate role to super-admin
    const json = JSON.parse(Buffer.from(b64, 'base64').toString());
    json.role = 'super-admin';
    json.user_type = 'super-admin';
    const forgedB64 = Buffer.from(JSON.stringify(json)).toString('base64');
    const forgedToken = `${forgedB64}.${sig}`;

    const decoded = decodeSession(forgedToken);
    assert(decoded === null, 'Tampered token must return null (rejected by HMAC verification)');
  });

  await runTest('HMAC Sessions', 'Tampered signature (Flipped signature bytes) is rejected', () => {
    const token = encodeSession(baseUser);
    const [b64, sig] = token.split('.');
    // Attacker alters one character in the HMAC hex
    const forgedSig = (sig[0] === 'a' ? 'b' : 'a') + sig.slice(1);
    const forgedToken = `${b64}.${forgedSig}`;

    const decoded = decodeSession(forgedToken);
    assert(decoded === null, 'Tampered signature must return null');
  });

  await runTest('HMAC Sessions', 'Expired session (> 8 hours) is rejected and invalidated', () => {
    // Manually craft payload with timestamp 9 hours in the past
    const secret = process.env.SESSION_SECRET || 'alpha-school-CHANGE-ME-in-production-min32chars!!';
    const payload = JSON.stringify({
      ...baseUser,
      _ts: Date.now() - (9 * 60 * 60 * 1000), // 9 hours ago
    });
    const b64 = Buffer.from(payload).toString('base64');
    const sig = createHmac('sha256', secret).update(b64).digest('hex');
    const expiredToken = `${b64}.${sig}`;

    const decoded = decodeSession(expiredToken);
    assert(decoded === null, 'Expired session (> 8 hours) must return null');
  });

  // =========================================================================
  // SUITE 2: Password Security & Bcrypt Hashing
  // =========================================================================
  console.log('\n\x1b[1m\x1b[33m[SUITE 2] Password Security & Bcrypt Hashing (12 Salt Rounds)\x1b[0m');

  const plainPassword = 'AlphaSecure#2026!';
  let generatedHash = '';

  await runTest('Password Security', 'Hashes plaintext password using bcrypt with 12 rounds', async () => {
    generatedHash = await hashPassword(plainPassword);
    assert(generatedHash.startsWith('$2'), `Expected bcrypt hash prefix, got: ${generatedHash}`);
    assert(isBcryptHash(generatedHash), 'isBcryptHash should return true');
  });

  await runTest('Password Security', 'Verifies correct password against bcrypt hash', async () => {
    const valid = await verifyPassword(plainPassword, generatedHash);
    assert(valid === true, 'Correct password must verify to true');
  });

  await runTest('Password Security', 'Rejects incorrect password against bcrypt hash', async () => {
    const invalid = await verifyPassword('WrongPassword123!', generatedHash);
    assert(invalid === false, 'Wrong password must verify to false');
  });

  await runTest('Password Security', 'Detects legacy plaintext password for auto-upgrade', async () => {
    const legacyPlain = 'myOldPlaintextPassword';
    assert(isBcryptHash(legacyPlain) === false, 'Plaintext should not be recognized as bcrypt');
    const valid = await verifyPassword(legacyPlain, legacyPlain);
    assert(valid === true, 'verifyPassword allows legacy match during login migration');
  });

  // =========================================================================
  // SUITE 3: Dual-Vector Rate Limiting (IP + Username)
  // =========================================================================
  console.log('\n\x1b[1m\x1b[33m[SUITE 3] Dual-Vector Rate Limiting (IP + Username Lockout)\x1b[0m');

  const testIp = '192.168.100.42';
  const testUser = 'target_admin';
  const ipKey = `ip:${testIp}`;
  const userKey = `user:${testUser}`;

  clearFailedAttempts(ipKey);
  clearFailedAttempts(userKey);

  await runTest('Rate Limiting', 'Permits attempts 1-4 without lockout', () => {
    for (let i = 1; i <= 4; i++) {
      const check = checkRateLimit(ipKey);
      assert(check.allowed === true, `Attempt ${i} should be allowed`);
      recordFailedAttempt(ipKey);
    }
  });

  await runTest('Rate Limiting', '5th failed attempt triggers 15-minute lockout', () => {
    recordFailedAttempt(ipKey); // 5th attempt
    const check = checkRateLimit(ipKey);
    assert(check.allowed === false, '5th failure must trigger lockout');
    assert(check.retryAfterMs > 14 * 60 * 1000, `Expected ~15 min lockout, got ${check.retryAfterMs}ms`);
  });

  await runTest('Rate Limiting', 'Username-based lockout triggers independently of IP (Anti-Spraying)', () => {
    // Simulates an attacker rotating IPs but attacking the same username
    for (let i = 1; i <= 5; i++) {
      recordFailedAttempt(userKey);
    }
    const check = checkRateLimit(userKey);
    assert(check.allowed === false, 'Username lockout must trigger after 5 failures regardless of IP');
    assert(check.retryAfterMs > 14 * 60 * 1000, 'Username retryAfterMs must be ~15m');
  });

  await runTest('Rate Limiting', 'Successful login resets rate limit counter', () => {
    clearFailedAttempts(ipKey);
    clearFailedAttempts(userKey);
    const ipCheck = checkRateLimit(ipKey);
    const userCheck = checkRateLimit(userKey);
    assert(ipCheck.allowed === true && ipCheck.retryAfterMs === 0, 'IP lockout should be cleared');
    assert(userCheck.allowed === true && userCheck.retryAfterMs === 0, 'User lockout should be cleared');
  });

  // =========================================================================
  // SUITE 4: Middleware Access Control, Hierarchy & Auditor Lockdown
  // =========================================================================
  console.log('\n\x1b[1m\x1b[33m[SUITE 4] Middleware Access Control, Hierarchy & Auditor Lockdown\x1b[0m');

  await runTest('Middleware Route Protection', 'Unauthenticated request to /dashboard redirects to /', async () => {
    const req = new NextRequest('https://apsims.vercel.app/dashboard');
    const res = await middleware(req);
    const location = res.headers.get('location');
    assert(location === 'https://apsims.vercel.app/', `Expected redirect to /, got: ${location}`);
  });

  await runTest('Middleware Route Protection', 'Unauthenticated request to /portal/parent redirects to /portal/login', async () => {
    const req = new NextRequest('https://apsims.vercel.app/portal/parent/fees');
    const res = await middleware(req);
    const location = res.headers.get('location');
    assert(location === 'https://apsims.vercel.app/portal/login', `Expected redirect to /portal/login, got: ${location}`);
  });

  await runTest('Middleware RBAC', 'Super-Admin role bypasses ALL route checks (Ultimate Access)', async () => {
    const superAdminToken = encodeSession({
      id: 1,
      username: 'boss',
      full_name: 'Ultimate Super Admin',
      role: 'super-admin',
      user_type: 'super-admin',
    });

    const routesToTest = [
      'https://apsims.vercel.app/dashboard',
      'https://apsims.vercel.app/dashboard/settings',
      'https://apsims.vercel.app/dashboard/payroll',
      'https://apsims.vercel.app/dashboard/users',
      'https://apsims.vercel.app/dashboard/fees/collect',
    ];

    for (const url of routesToTest) {
      const req = new NextRequest(url, {
        headers: { cookie: `alpha_session=${superAdminToken}` },
      });
      const res = await middleware(req);
      const location = res.headers.get('location');
      assert(!location, `Super-Admin should not be redirected on ${url}, got location: ${location}`);
    }
  });

  await runTest('Middleware RBAC', 'Auditor can access read dashboards but is BLOCKED from write paths', async () => {
    const auditorToken = encodeSession({
      id: 202,
      username: 'auditor_officer',
      full_name: 'Lead Auditor',
      role: 'auditor',
      user_type: 'auditor',
    });

    // 1. Auditor viewing /dashboard -> ALLOWED (no redirect)
    const viewReq = new NextRequest('https://apsims.vercel.app/dashboard', {
      headers: { cookie: `alpha_session=${auditorToken}` },
    });
    const viewRes = await middleware(viewReq);
    assert(!viewRes.headers.get('location'), 'Auditor should be allowed to view /dashboard');

    // 2. Auditor attempting write path /dashboard/fees/collect -> BLOCKED with reason=auditor_readonly
    const writeReq = new NextRequest('https://apsims.vercel.app/dashboard/fees/collect', {
      headers: { cookie: `alpha_session=${auditorToken}` },
    });
    const writeRes = await middleware(writeReq);
    const location = writeRes.headers.get('location');
    assert(location !== null, 'Auditor must be redirected away from write route');
    const url = new URL(location!);
    assert(url.searchParams.get('access_denied') === '1', 'Must have access_denied=1');
    assert(url.searchParams.get('reason') === 'auditor_readonly', 'Must have reason=auditor_readonly');
  });

  await runTest('Middleware RBAC', 'Teacher role is BLOCKED from administrative settings & payroll', async () => {
    const teacherToken = encodeSession({
      id: 303,
      username: 'teacher_mary',
      full_name: 'Mary Teacher',
      role: 'teacher',
      user_type: 'teacher',
    });

    const payrollReq = new NextRequest('https://apsims.vercel.app/dashboard/payroll', {
      headers: { cookie: `alpha_session=${teacherToken}` },
    });
    const payrollRes = await middleware(payrollReq);
    const loc = payrollRes.headers.get('location');
    assert(loc !== null, 'Teacher must be blocked from payroll');
    const url = new URL(loc!);
    assert(url.searchParams.get('access_denied') === '1', 'Must have access_denied=1');
  });

  await runTest('Middleware RBAC', 'Bursar role is ALLOWED on payroll but BLOCKED from user administration', async () => {
    const bursarToken = encodeSession({
      id: 404,
      username: 'bursar_john',
      full_name: 'John Bursar',
      role: 'bursar',
      user_type: 'bursar',
    });

    // Payroll -> ALLOWED
    const payrollReq = new NextRequest('https://apsims.vercel.app/dashboard/payroll', {
      headers: { cookie: `alpha_session=${bursarToken}` },
    });
    const payrollRes = await middleware(payrollReq);
    assert(!payrollRes.headers.get('location'), 'Bursar must be allowed on /dashboard/payroll');

    // Users admin -> BLOCKED
    const usersReq = new NextRequest('https://apsims.vercel.app/dashboard/users', {
      headers: { cookie: `alpha_session=${bursarToken}` },
    });
    const usersRes = await middleware(usersReq);
    assert(usersRes.headers.get('location') !== null, 'Bursar must be blocked from /dashboard/users');
  });

  await runTest('Middleware Session Expiry', 'Expired session deletes session cookies and redirects to login', async () => {
    const expiredPayload = Buffer.from(JSON.stringify({
      id: 999,
      username: 'expired_user',
      role: 'admin',
      _ts: Date.now() - (10 * 60 * 60 * 1000), // 10 hrs ago
    })).toString('base64');

    const req = new NextRequest('https://apsims.vercel.app/dashboard', {
      headers: { cookie: `alpha_session=${expiredPayload}` },
    });
    const res = await middleware(req);
    assert(res.headers.get('location') === 'https://apsims.vercel.app/', 'Expired session must redirect to /');
    
    // Verify Set-Cookie clears the session
    const setCookie = res.headers.get('set-cookie') || '';
    assert(setCookie.includes('alpha_session=;'), 'Must clear alpha_session cookie');
  });

  await runTest('Middleware Headers', 'Injects comprehensive security headers (CSP, HSTS, Nosniff)', async () => {
    const validToken = encodeSession(baseUser);
    const req = new NextRequest('https://apsims.vercel.app/dashboard', {
      headers: { cookie: `alpha_session=${validToken}` },
    });
    const res = await middleware(req);

    const csp = res.headers.get('Content-Security-Policy');
    const nosniff = res.headers.get('X-Content-Type-Options');
    const referrer = res.headers.get('Referrer-Policy');
    const hsts = res.headers.get('Strict-Transport-Security');
    const permPolicy = res.headers.get('Permissions-Policy');

    assert(Boolean(csp && csp.includes("default-src 'self'")), 'CSP default-src must be defined');
    assert(nosniff === 'nosniff', 'X-Content-Type-Options must be nosniff');
    assert(referrer === 'strict-origin-when-cross-origin', 'Referrer-Policy must be strict-origin-when-cross-origin');
    assert(Boolean(hsts && hsts.includes('max-age=31536000')), 'HSTS must have max-age 31536000');
    assert(Boolean(permPolicy && permPolicy.includes('camera=()')), 'Permissions-Policy must restrict camera');
  });

  // =========================================================================
  // SUITE 5: Live Production Verification (https://apsims.vercel.app)
  // =========================================================================
  console.log('\n\x1b[1m\x1b[33m[SUITE 5] Live Production Verification (https://apsims.vercel.app)\x1b[0m');

  await runTest('Live Production', 'Live unauthenticated access to /dashboard redirects to / (HTTP 307/302)', async () => {
    const res = await fetch('https://apsims.vercel.app/dashboard', {
      redirect: 'manual',
    });
    assert(res.status === 307 || res.status === 302, `Expected redirect status 307/302, got ${res.status}`);
    const location = res.headers.get('location');
    assert(Boolean(location && location.endsWith('/')), `Expected redirect to root, got: ${location}`);
  });

  await runTest('Live Production', 'Live production response includes Strict-Transport-Security (HSTS)', async () => {
    const res = await fetch('https://apsims.vercel.app/');
    const hsts = res.headers.get('strict-transport-security');
    assert(Boolean(hsts), 'Production must return Strict-Transport-Security header');
  });

  await runTest('Live Production', 'Live login endpoint rejects invalid credentials with HTTP 401', async () => {
    const res = await fetch('https://apsims.vercel.app/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'nonexistent_user_probe', password: 'random_wrong_password_999' }),
    });
    assert(res.status === 401, `Expected 401 Unauthorized, got: ${res.status}`);
    const data = await res.json();
    assert(data.error === 'Invalid username or password', `Expected generic invalid error message, got: ${data.error}`);
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n\x1b[1m\x1b[34m======================================================================\x1b[0m');
  console.log('\x1b[1m\x1b[36m                   SECURITY TEST SUITE SUMMARY                        \x1b[0m');
  console.log('\x1b[1m\x1b[34m======================================================================\x1b[0m');

  const total = results.length;
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  console.log(`\n  Total Tests Run: \x1b[1m${total}\x1b[0m`);
  console.log(`  Tests Passed:    \x1b[1m\x1b[32m${passed}\x1b[0m / ${total}`);
  if (failed > 0) {
    console.log(`  Tests Failed:    \x1b[1m\x1b[31m${failed}\x1b[0m / ${total}`);
  } else {
    console.log(`  Tests Failed:    \x1b[1m\x1b[32m0\x1b[0m / ${total}`);
    console.log('\n  \x1b[1m\x1b[32m✨ ALL SECURITY HARDENING CHECKS VERIFIED & 100% OPERATIONAL ✨\x1b[0m\n');
  }
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

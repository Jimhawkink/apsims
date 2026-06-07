import { NextRequest, NextResponse } from 'next/server';

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/portal/login',
];

// ─── Role hierarchy ─────────────────────────────────────────────────────────
// auditor  → read-only across entire dashboard (blocked from all write routes)
// bursar   → finance + fees only
// teacher  → exams + attendance only
// admin / principal → full access
// ─────────────────────────────────────────────────────────────────────────────

// Routes that require specific roles
const ROLE_ROUTES: Record<string, string[]> = {
  '/dashboard/settings':        ['admin', 'principal'],
  '/dashboard/payroll':         ['admin', 'principal', 'bursar'],
  '/dashboard/users':           ['admin', 'principal'],
  '/dashboard/sms':             ['admin', 'principal'],
  '/dashboard/website-builder': ['admin', 'principal'],
  '/dashboard/bank-reconciliation': ['admin', 'principal', 'bursar'],
  '/dashboard/staff/salary-slips':  ['admin', 'principal', 'bursar'],
  '/dashboard/ptm':             ['admin', 'principal', 'teacher'],
};

// Write-action routes blocked for auditor role (auditor = read-only)
const AUDITOR_BLOCKED_PATHS = [
  '/dashboard/fees/collect',
  '/dashboard/fees/bulk-reminders',
  '/dashboard/students/new',
  '/dashboard/expenses',
  '/dashboard/income',
  '/dashboard/payroll',
  '/dashboard/staff/salary-slips',
  '/dashboard/settings',
  '/dashboard/users',
  '/dashboard/sms',
  '/dashboard/website-builder',
  '/dashboard/exams/marks',
  '/dashboard/attendance/mark',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // static files
  ) {
    return NextResponse.next();
  }

  // Allow public routes + public school website
  if (PUBLIC_ROUTES.some(r => pathname === r) || pathname.startsWith('/school')) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = req.cookies.get('alpha_session')?.value;

  if (!sessionCookie) {
    // No session — redirect to login
    if (pathname.startsWith('/portal/')) {
      return NextResponse.redirect(new URL('/portal/login', req.url));
    }
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Validate session (basic decode check — full validation happens server-side)
  let decoded: any;
  try {
    decoded = JSON.parse(Buffer.from(sessionCookie, 'base64').toString());

    // Check expiry (7 days rolling — matches auth.ts)
    if (!decoded._ts || Date.now() - decoded._ts > 7 * 24 * 60 * 60 * 1000) {
      // Expired — clear and redirect
      const res = pathname.startsWith('/portal/')
        ? NextResponse.redirect(new URL('/portal/login', req.url))
        : NextResponse.redirect(new URL('/', req.url));
      res.cookies.delete('alpha_session');
      res.cookies.delete('alpha_csrf');
      return res;
    }

    const userRole = (decoded.role || decoded.user_type || '').toLowerCase();

    // ── Auditor: block all write routes ──────────────────────────────────────
    if (userRole === 'auditor') {
      const isBlocked = AUDITOR_BLOCKED_PATHS.some(p => pathname.startsWith(p));
      if (isBlocked) {
        const url = new URL('/dashboard', req.url);
        url.searchParams.set('access_denied', '1');
        url.searchParams.set('reason', 'auditor_readonly');
        return NextResponse.redirect(url);
      }
    }

    // ── Role-based access check ───────────────────────────────────────────────
    for (const [route, roles] of Object.entries(ROLE_ROUTES)) {
      if (pathname.startsWith(route)) {
        if (!roles.includes(userRole)) {
          // Access denied — redirect to dashboard with notice
          const url = new URL('/dashboard', req.url);
          url.searchParams.set('access_denied', '1');
          return NextResponse.redirect(url);
        }
      }
    }

    // Portal route type check
    if (pathname.startsWith('/portal/parent') && decoded.user_type_portal !== 'parent' && decoded.role !== 'parent') {
      return NextResponse.redirect(new URL('/portal/login', req.url));
    }
    if (pathname.startsWith('/portal/student') && decoded.user_type_portal !== 'student' && decoded.role !== 'student') {
      return NextResponse.redirect(new URL('/portal/login', req.url));
    }

  } catch {
    // Invalid session — clear and redirect
    const res = pathname.startsWith('/portal/')
      ? NextResponse.redirect(new URL('/portal/login', req.url))
      : NextResponse.redirect(new URL('/', req.url));
    res.cookies.delete('alpha_session');
    res.cookies.delete('alpha_csrf');
    return res;
  }

  // ─── Rolling Session Refresh ───
  // Refresh the session timestamp on every valid request so active users
  // stay logged in. Only re-issue if the token is older than 1 hour to
  // avoid unnecessary cookie writes on every request.
  const SEVEN_DAYS_S = 7 * 24 * 60 * 60;
  const ONE_HOUR_MS = 60 * 60 * 1000;

  const res = NextResponse.next();

  if (decoded && decoded._ts && (Date.now() - decoded._ts > ONE_HOUR_MS)) {
    // Re-issue cookie with fresh timestamp (keeps same user data, resets expiry)
    const { _ts, ...rest } = decoded;
    const newToken = Buffer.from(JSON.stringify({
      ...rest,
      _ts: Date.now(),
    })).toString('base64');
    res.cookies.set('alpha_session', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SEVEN_DAYS_S,
      path: '/',
    });
  }

  // ─── Security Headers ───
  // Content Security Policy — permissive to allow YouTube embeds + thumbnails
  res.headers.set('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://www.youtube.com https://s.ytimg.com https://www.google.com https://www.gstatic.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "img-src * data: blob:; " +
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; " +
    "connect-src 'self' https: wss:; " +
    "media-src 'self' https://www.youtube.com https://www.youtube-nocookie.com blob:; " +
    "worker-src 'self' blob:; " +
    "base-uri 'self'; " +
    "form-action 'self';"
  );

  // Other security headers
  // NOTE: X-Frame-Options removed — we use frame-src in CSP instead (DENY would break YouTube iframes)
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (static files)
     * - api (API routes handle their own auth)
     * - favicon.ico
     */
    '/((?!_next|api|favicon).*)',
  ],
};

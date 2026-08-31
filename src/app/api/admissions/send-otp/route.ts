export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { Resend } from 'resend';

const SECRET = process.env.OTP_SECRET || 'apsims-otp-2026-xK9mP3qR';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'admissions@apsims.vercel.app';

// TOTP-style: OTP changes every 5 minutes, stateless — no DB needed
function generateOTP(phone: string): string {
  const window = Math.floor(Date.now() / (5 * 60 * 1000));
  const h = createHmac('sha256', SECRET);
  h.update(`${phone}:${window}`);
  const num = parseInt(h.digest('hex').substring(0, 8), 16);
  return String(num % 1000000).padStart(6, '0');
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const phone = (body.phone || '').replace(/\s+/g, '').trim();
  const email = (body.email || '').trim();

  if (!phone) {
    return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: 'Guardian email address is required to send the verification code' }, { status: 400 });
  }
  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }

  const otp = generateOTP(phone);

  // Send via Resend email
  if (!RESEND_API_KEY) {
    console.log(`[OTP] No RESEND_API_KEY — OTP for ${phone}: ${otp}`);
    // Still return success so form works; admin can check Vercel logs
    return NextResponse.json({ success: true, note: 'Email not configured — check Vercel logs' });
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Your APSIMS Admissions Verification Code: ${otp}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f0f4f8;font-family:system-ui,-apple-system,sans-serif;">
          <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);padding:32px 32px 24px;text-align:center;">
              <p style="margin:0;font-size:32px;">🎓</p>
              <h1 style="margin:8px 0 4px;color:#fff;font-size:20px;font-weight:900;">APSIMS School</h1>
              <p style="margin:0;color:#93c5fd;font-size:13px;">Online Admissions Portal</p>
            </div>
            <!-- Body -->
            <div style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#374151;font-weight:600;">Hello,</p>
              <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">
                Your verification code for the online admissions application is:
              </p>
              <!-- OTP Box -->
              <div style="background:#f0f9ff;border:2px solid #bfdbfe;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
                <p style="margin:0 0 4px;font-size:12px;color:#6b7280;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;">Verification Code</p>
                <p style="margin:0;font-size:40px;font-weight:900;color:#1d4ed8;letter-spacing:0.25em;font-family:monospace;">${otp}</p>
                <p style="margin:8px 0 0;font-size:12px;color:#9ca3af;">Valid for 5 minutes only</p>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.6;">
                Enter this code on the admissions form to verify your phone number and continue with the application.
              </p>
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin:16px 0 0;">
                <p style="margin:0;font-size:12px;color:#92400e;">
                  ⚠️ <strong>Do NOT share this code</strong> with anyone. APSIMS staff will never ask for your verification code.
                </p>
              </div>
            </div>
            <!-- Footer -->
            <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">APSIMS School Management System · Online Admissions</p>
              <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">apsims.vercel.app/admissions</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });
    console.log(`[OTP] Email sent to ${email} for phone ${phone}`);
  } catch (err: any) {
    console.error('[OTP] Resend error:', err?.message || err);
    return NextResponse.json({ error: 'Failed to send verification email. Please check your email address and try again.' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

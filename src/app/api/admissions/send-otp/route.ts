export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';

const SECRET = process.env.OTP_SECRET || 'apsims-otp-2026-xK9mP3qR';

function generateOTP(phone: string): string {
  const window = Math.floor(Date.now() / (5 * 60 * 1000));
  const h = createHmac('sha256', SECRET);
  h.update(`${phone}:${window}`);
  const num = parseInt(h.digest('hex').substring(0, 8), 16);
  return String(num % 1000000).padStart(6, '0');
}

// Read SMTP config — env vars first (most reliable), then DB
async function getSmtpConfig() {
  // PRIMARY: Vercel environment variables (always works)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      fromName: process.env.SMTP_FROM_NAME || 'APSIMS Admissions',
      fromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
    };
  }

  // FALLBACK: Read from school_details table in DB
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data, error } = await sb
      .from('school_details')
      .select('smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from_name, smtp_from_email, smtp_enabled')
      .limit(1)
      .maybeSingle();

    if (error) console.log('[OTP] DB SMTP read error:', error.message);

    if (data?.smtp_user && data?.smtp_pass && data?.smtp_enabled !== false) {
      return {
        host: data.smtp_host || 'smtp.gmail.com',
        port: Number(data.smtp_port) || 587,
        user: data.smtp_user,
        pass: data.smtp_pass,
        fromName: data.smtp_from_name || 'APSIMS Admissions',
        fromEmail: data.smtp_from_email || data.smtp_user,
      };
    }
  } catch (e: any) {
    console.log('[OTP] Could not read SMTP from DB:', e?.message);
  }
  return null;
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const phone = (body.phone || '').replace(/\s+/g, '').trim();
  const email = (body.email || '').trim();

  if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
  if (!email) return NextResponse.json({ error: 'Guardian email is required — the verification code will be sent there' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });

  const otp = generateOTP(phone);
  const smtpConfig = await getSmtpConfig();

  if (!smtpConfig) {
    // No SMTP configured at all — admin must set it up
    return NextResponse.json({
      error: 'Email not configured. Please ask the school admin to set up SMTP email settings in the Super Admin panel.',
    }, { status: 503 });
  }

  // Send via Nodemailer (Gmail SMTP or any SMTP)
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass,
      },
      tls: { rejectUnauthorized: false },
    });

    await transporter.sendMail({
      from: `"${smtpConfig.fromName}" <${smtpConfig.fromEmail}>`,
      to: email,
      subject: `APSIMS Admissions — Verification Code: ${otp}`,
      html: `
        <div style="max-width:480px;margin:40px auto;background:#ffffff;border-radius:16px;
          overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);font-family:Arial,sans-serif;">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);padding:28px 32px;text-align:center;">
            <p style="margin:0;font-size:36px;">🎓</p>
            <h1 style="margin:8px 0 4px;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">APSIMS School</h1>
            <p style="margin:0;color:#93c5fd;font-size:13px;">Online Admissions Portal</p>
          </div>
          <!-- Body -->
          <div style="padding:32px;">
            <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hello,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">
              Your <strong>6-digit verification code</strong> for the online admissions application is:
            </p>
            <!-- OTP Box -->
            <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:14px;
              padding:28px 24px;text-align:center;margin:0 0 24px;">
              <p style="margin:0 0 6px;font-size:11px;color:#6b7280;font-weight:700;
                letter-spacing:0.12em;text-transform:uppercase;">Your Verification Code</p>
              <p style="margin:0;font-size:48px;font-weight:900;color:#1d4ed8;
                letter-spacing:0.3em;font-family:Courier New,monospace;">${otp}</p>
              <p style="margin:10px 0 0;font-size:12px;color:#9ca3af;">⏱ Valid for 5 minutes only</p>
            </div>
            <p style="margin:0 0 16px;font-size:13px;color:#6b7280;line-height:1.7;">
              Enter this code on the admissions form to verify your contact and submit the application.
            </p>
            <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;
              padding:12px 16px;">
              <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
                ⚠️ <strong>Do NOT share</strong> this code with anyone.
                APSIMS staff will <strong>never</strong> ask for your code.
              </p>
            </div>
          </div>
          <!-- Footer -->
          <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;text-align:center;">
            <p style="margin:0;font-size:11px;color:#9ca3af;">APSIMS School Management System</p>
            <p style="margin:3px 0 0;font-size:11px;color:#9ca3af;">apsims.vercel.app/admissions</p>
          </div>
        </div>
      `,
    });

    console.log(`[OTP] ✅ Email sent to ${email} via ${smtpConfig.host}`);
    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('[OTP] Gmail SMTP error:', err?.message || err);
    return NextResponse.json({
      error: `Failed to send email: ${err?.message || 'SMTP error'}. Check SMTP settings in Super Admin panel.`,
    }, { status: 500 });
  }
}

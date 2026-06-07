export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const SECRET = process.env.OTP_SECRET || 'apsims-otp-2026-xK9mP3qR';

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
  if (!phone || !/^(\+254|0)[17]\d{8}$/.test(phone)) {
    return NextResponse.json({ error: 'Enter a valid Kenyan phone number (e.g. 0712345678)' }, { status: 400 });
  }

  const otp = generateOTP(phone);
  const msg = `Your APSIMS Admissions verification code is: ${otp}\nValid for 5 minutes. Do NOT share this code.\n- APSIMS School Admissions`;

  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://apsims.vercel.app';
  try {
    await fetch(`${base}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message: msg }),
    });
  } catch { /* SMS failure is non-blocking */ }

  return NextResponse.json({ success: true });
}

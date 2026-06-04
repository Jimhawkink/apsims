import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

const SECRET = process.env.OTP_SECRET || 'apsims-otp-2026-xK9mP3qR';

function generateOTP(phone: string, windowOffset = 0): string {
  const window = Math.floor(Date.now() / (5 * 60 * 1000)) - windowOffset;
  const h = createHmac('sha256', SECRET);
  h.update(`${phone}:${window}`);
  const num = parseInt(h.digest('hex').substring(0, 8), 16);
  return String(num % 1000000).padStart(6, '0');
}

function makeToken(phone: string): string {
  const ts = Date.now();
  const h = createHmac('sha256', SECRET);
  h.update(`verified:${phone}:${ts}`);
  return Buffer.from(`${phone}|${ts}|${h.digest('hex')}`).toString('base64url');
}

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad request' }, { status: 400 }); }

  const phone = (body.phone || '').replace(/\s+/g, '').trim();
  const otp   = (body.otp   || '').trim();

  if (!phone || !otp) {
    return NextResponse.json({ error: 'Phone and OTP are required' }, { status: 400 });
  }

  // Accept current window and previous (covers edge: OTP sent just before window roll)
  const valid = generateOTP(phone, 0) === otp || generateOTP(phone, 1) === otp;
  if (!valid) {
    return NextResponse.json({ error: 'Incorrect or expired code. Request a new one.' }, { status: 400 });
  }

  return NextResponse.json({ success: true, token: makeToken(phone) });
}

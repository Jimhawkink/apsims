import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// M-Pesa C2B URL Registration
// Call this ONCE to tell Safaricom where to send paybill callbacks.
// POST /api/mpesa/c2b-register
// ─────────────────────────────────────────────────────────────────────────────

const MPESA_BASE = process.env.MPESA_ENV === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken(): Promise<string> {
  const key    = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const auth   = Buffer.from(`${key}:${secret}`).toString('base64');
  const res    = await fetch(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    const token     = await getAccessToken();
    const shortcode = process.env.MPESA_SHORTCODE!;
    const appUrl    = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

    const payload = {
      ShortCode:       shortcode,
      ResponseType:    'Completed',   // or 'Cancelled' to reject unknowns
      ConfirmationURL: `${appUrl}/api/mpesa/c2b-confirm`,
      ValidationURL:   `${appUrl}/api/mpesa/c2b-validate`,
    };

    const res = await fetch(`${MPESA_BASE}/mpesa/c2b/v1/registerurl`, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    console.log('C2B Registration response:', data);

    if (data.ResponseDescription?.toLowerCase().includes('success') || data.ResponseCode === '0') {
      return NextResponse.json({
        success: true,
        message: 'C2B URLs registered with Safaricom ✅',
        urls: {
          validation:   payload.ValidationURL,
          confirmation: payload.ConfirmationURL,
        },
        safaricom: data,
      });
    }

    return NextResponse.json({ success: false, error: data }, { status: 400 });
  } catch (err: any) {
    console.error('C2B Register Error:', err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status:  'C2B Registration endpoint ready',
    method:  'POST this endpoint to register your Safaricom C2B callback URLs',
    env:     process.env.MPESA_ENV || 'sandbox',
    appUrl:  process.env.NEXT_PUBLIC_APP_URL || 'not set',
    shortcode: process.env.MPESA_SHORTCODE || 'not set',
  });
}

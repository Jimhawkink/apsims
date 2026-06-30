export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// ── M-Pesa Production Credentials ─────────────────────────────────────────────
const MPESA_ENV         = process.env.MPESA_ENV || 'sandbox';
const CONSUMER_KEY      = process.env.MPESA_CONSUMER_KEY || '';
const CONSUMER_SECRET   = process.env.MPESA_CONSUMER_SECRET || '';
const SHORTCODE         = process.env.MPESA_SHORTCODE || '174379';
const PASSKEY           = process.env.MPESA_PASSKEY || '';
const ACCOUNT_TYPE      = process.env.MPESA_ACCOUNT_TYPE || 'Till'; // Till | Paybill
const TILL_NUMBER       = process.env.MPESA_TILL_NUMBER || SHORTCODE;
const CALLBACK_URL      = process.env.MPESA_CALLBACK_URL || 'https://apsims.vercel.app/api/mpesa/callback';

const BASE_URL = MPESA_ENV === 'live'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

// ── Helpers ───────────────────────────────────────────────────────────────────
function timestamp(): string {
  const n = new Date();
  const p = (v: number) => v.toString().padStart(2, '0');
  return `${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
}

function makePassword(sc: string, pk: string, ts: string): string {
  return Buffer.from(`${sc}${pk}${ts}`).toString('base64');
}

function normalizePhone(phone: string): string {
  const p = phone.trim().replace(/\s|-/g, '');
  if (p.startsWith('0') && p.length === 10) return `254${p.slice(1)}`;
  if (p.startsWith('+')) return p.slice(1);
  return p;
}

async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

// ── POST /api/payments/mpesa-stk ──────────────────────────────────────────────
// Mobile-friendly: no session/CSRF required
// Body: { phone, amount, accountReference?, transactionDesc?, studentId? }
export async function POST(req: NextRequest) {
  try {
    if (!CONSUMER_KEY || !CONSUMER_SECRET || !PASSKEY) {
      return NextResponse.json(
        { error: 'M-Pesa not configured. Contact the school administrator.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { phone, amount, accountReference, transactionDesc, studentId } = body;

    if (!phone || !amount) {
      return NextResponse.json({ error: 'Phone and amount are required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(phone);
    if (!/^2547\d{8}$|^2541\d{8}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: 'Invalid Kenyan phone number' }, { status: 400 });
    }

    const amountInt = Math.ceil(Number(amount));
    if (isNaN(amountInt) || amountInt < 1) {
      return NextResponse.json({ error: 'Amount must be at least KES 1' }, { status: 400 });
    }

    // ── Build STK payload ──────────────────────────────────────────────────
    const ts  = timestamp();
    const pwd = makePassword(SHORTCODE, PASSKEY, ts);
    const accessToken = await getAccessToken();

    // For Till (Buy Goods): TransactionType=CustomerBuyGoodsOnline, PartyB=TillNumber
    // For Paybill:          TransactionType=CustomerPayBillOnline,  PartyB=ShortCode
    const isTill = ACCOUNT_TYPE.toLowerCase() === 'till';
    const txnType = isTill ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline';
    const partyB  = isTill ? TILL_NUMBER : SHORTCODE;

    const stkPayload = {
      BusinessShortCode: SHORTCODE,
      Password:          pwd,
      Timestamp:         ts,
      TransactionType:   txnType,
      Amount:            amountInt,
      PartyA:            normalizedPhone,
      PartyB:            partyB,
      PhoneNumber:       normalizedPhone,
      CallBackURL:       CALLBACK_URL,
      AccountReference:  accountReference || `SCH-${studentId || Date.now()}`,
      TransactionDesc:   transactionDesc || 'School Fee Payment',
    };

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const result = await stkRes.json();
    console.log('STK Push response:', JSON.stringify(result));

    if (result.ResponseCode !== '0') {
      return NextResponse.json(
        { error: result.ResponseDescription || result.errorMessage || 'STK push rejected by Safaricom' },
        { status: 400 }
      );
    }

    // ── Log to Supabase ────────────────────────────────────────────────────
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      await supabase.from('school_mpesa_transactions').insert([{
        merchant_request_id:  result.MerchantRequestID,
        checkout_request_id:  result.CheckoutRequestID,
        amount:               amountInt,
        phone_number:         normalizedPhone,
        student_id:           studentId || null,
        account_reference:    stkPayload.AccountReference,
        transaction_desc:     stkPayload.TransactionDesc,
        status:               'processing',
        result_code:          result.ResponseCode,
        result_desc:          result.ResponseDescription,
      }]);
    } catch (dbErr) {
      // Non-fatal — STK was already sent
      console.warn('DB log failed:', dbErr);
    }

    // ── Return mobile-expected format ──────────────────────────────────────
    return NextResponse.json({
      success:           true,
      checkoutRequestId: result.CheckoutRequestID,
      merchantRequestId: result.MerchantRequestID,
      message:           'STK push sent. Check your phone and enter M-Pesa PIN.',
    });

  } catch (err: any) {
    console.error('M-Pesa STK error:', err.message);
    return NextResponse.json(
      { error: err.message || 'STK push failed. Please try again.' },
      { status: 500 }
    );
  }
}

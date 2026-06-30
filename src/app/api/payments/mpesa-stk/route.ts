export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

async function getAccessToken(baseUrl: string, key: string, secret: string): Promise<string> {
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Token fetch failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  if (!data.access_token) throw new Error('No access_token in Safaricom response');
  return data.access_token;
}

// ── Load credentials from school_settings DB, fallback to env vars ────────────
// This means whatever you save in the web M-Pesa Config page is used here too
async function loadMpesaConfig(supabase: any) {
  const keys = [
    'mpesa_consumer_key', 'mpesa_consumer_secret', 'mpesa_shortcode',
    'mpesa_passkey', 'mpesa_callback_url', 'mpesa_environment',
    'mpesa_account_type', 'mpesa_till_number',
  ];
  const { data } = await supabase
    .from('school_settings')
    .select('key, value')
    .in('key', keys);

  const db: Record<string, string> = {};
  (data || []).forEach((r: any) => { if (r.value) db[r.key] = r.value; });

  return {
    consumerKey:    db.mpesa_consumer_key    || process.env.MPESA_CONSUMER_KEY    || '',
    consumerSecret: db.mpesa_consumer_secret || process.env.MPESA_CONSUMER_SECRET || '',
    shortcode:      db.mpesa_shortcode       || process.env.MPESA_SHORTCODE       || '174379',
    passkey:        db.mpesa_passkey         || process.env.MPESA_PASSKEY         || '',
    callbackUrl:    db.mpesa_callback_url    || process.env.MPESA_CALLBACK_URL    || 'https://apsims.vercel.app/api/mpesa/callback',
    environment:    db.mpesa_environment     || process.env.MPESA_ENV             || 'production',
    accountType:    db.mpesa_account_type    || process.env.MPESA_ACCOUNT_TYPE    || 'Till',
    tillNumber:     db.mpesa_till_number     || process.env.MPESA_TILL_NUMBER     || '',
  };
}

// ── POST /api/payments/mpesa-stk ──────────────────────────────────────────────
// Mobile-friendly: no session/CSRF — credentials read from school_settings DB
// Body: { phone, amount, accountReference?, transactionDesc?, studentId? }
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // ── Load M-Pesa config from DB (set via web Finance → M-Pesa Config page)
    const cfg = await loadMpesaConfig(supabase);

    if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.passkey) {
      return NextResponse.json(
        { error: 'M-Pesa not configured. Go to Finance → M-Pesa Config in the web admin and save your credentials.' },
        { status: 503 }
      );
    }

    const body = await req.json();
    const { phone, amount, accountReference, transactionDesc, studentId } = body;

    if (!phone || !amount) {
      return NextResponse.json({ error: 'Phone and amount are required' }, { status: 400 });
    }

    const normalizedPhone = normalizePhone(String(phone));
    if (!/^254[0-9]{9}$/.test(normalizedPhone)) {
      return NextResponse.json({ error: 'Invalid Kenyan phone number. Use format 07XXXXXXXX' }, { status: 400 });
    }

    const amountInt = Math.ceil(Number(amount));
    if (isNaN(amountInt) || amountInt < 1) {
      return NextResponse.json({ error: 'Amount must be at least KES 1' }, { status: 400 });
    }

    // ── Safaricom base URL ────────────────────────────────────────────────────
    const BASE_URL = cfg.environment.toLowerCase() === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    const ts  = timestamp();
    const pwd = makePassword(cfg.shortcode, cfg.passkey, ts);
    const accessToken = await getAccessToken(BASE_URL, cfg.consumerKey, cfg.consumerSecret);

    // Till (Buy Goods): TransactionType=CustomerBuyGoodsOnline, PartyB=TillNumber
    // Paybill:          TransactionType=CustomerPayBillOnline,  PartyB=Shortcode
    const isTill  = cfg.accountType.toLowerCase() === 'till';
    const txnType = isTill ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline';
    const partyB  = isTill ? (cfg.tillNumber || cfg.shortcode) : cfg.shortcode;

    const stkPayload = {
      BusinessShortCode: cfg.shortcode,
      Password:          pwd,
      Timestamp:         ts,
      TransactionType:   txnType,
      Amount:            amountInt,
      PartyA:            normalizedPhone,
      PartyB:            partyB,
      PhoneNumber:       normalizedPhone,
      CallBackURL:       cfg.callbackUrl,
      AccountReference:  accountReference || `SCH-${studentId || Date.now()}`,
      TransactionDesc:   transactionDesc  || 'School Fee Payment',
    };

    console.log('STK payload:', JSON.stringify({ ...stkPayload, Password: '***' }));

    const stkRes = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(stkPayload),
    });

    const result = await stkRes.json();
    console.log('STK response:', JSON.stringify(result));

    if (result.ResponseCode !== '0') {
      return NextResponse.json(
        { error: result.ResponseDescription || result.errorMessage || 'STK push rejected by Safaricom' },
        { status: 400 }
      );
    }

    // ── Log to Supabase ───────────────────────────────────────────────────────
    try {
      const { error: dbErr } = await supabase.from('school_mpesa_transactions').insert([{
        merchant_request_id: result.MerchantRequestID,
        checkout_request_id: result.CheckoutRequestID,
        amount:              amountInt,
        phone:               normalizedPhone,          // correct column name
        student_id:          studentId || null,
        status:              'pending',                // will be updated by callback
        result_code:         0,
        result_desc:         result.ResponseDescription || 'STK Push initiated',
      }]);
      if (dbErr) console.error('DB insert error (non-fatal):', dbErr.message);
    } catch (dbErr: any) {
      console.warn('DB log failed (non-fatal):', dbErr.message);
    }

    // ── Return format expected by mobile app ──────────────────────────────────
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

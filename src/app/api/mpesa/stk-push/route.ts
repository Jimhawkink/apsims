export const dynamic = 'force-dynamic';
// /api/mpesa/stk-push — Used by UltraPaymentModal (collect fee page)
// Reads credentials from school_settings DB (set via web M-Pesa Config page)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

function ts() {
  const n = new Date(), p = (v: number) => v.toString().padStart(2, '0');
  return `${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}${p(n.getHours())}${p(n.getMinutes())}${p(n.getSeconds())}`;
}
function b64(sc: string, pk: string, t: string) {
  return Buffer.from(`${sc}${pk}${t}`).toString('base64');
}
function normalizePhone(phone: string) {
  const p = phone.trim().replace(/\s|-/g, '');
  if (p.startsWith('0') && p.length === 10) return `254${p.slice(1)}`;
  if (p.startsWith('+')) return p.slice(1);
  return p;
}

async function loadConfig(supabase: any) {
  const { data } = await supabase
    .from('school_settings')
    .select('key, value')
    .in('key', ['mpesa_consumer_key','mpesa_consumer_secret','mpesa_shortcode',
                'mpesa_passkey','mpesa_callback_url','mpesa_environment',
                'mpesa_account_type','mpesa_till_number']);
  const db: Record<string,string> = {};
  (data||[]).forEach((r:any)=>{ if(r.value) db[r.key]=r.value; });
  return {
    key:       db.mpesa_consumer_key    || process.env.MPESA_CONSUMER_KEY    || '',
    secret:    db.mpesa_consumer_secret || process.env.MPESA_CONSUMER_SECRET || '',
    shortcode: db.mpesa_shortcode       || process.env.MPESA_SHORTCODE       || '',
    passkey:   db.mpesa_passkey         || process.env.MPESA_PASSKEY         || '',
    callbackUrl: db.mpesa_callback_url  || process.env.MPESA_CALLBACK_URL    || 'https://apsims.vercel.app/api/mpesa/callback',
    environment: db.mpesa_environment   || process.env.MPESA_ENV             || 'production',
    accountType: db.mpesa_account_type  || 'Till',
    tillNumber:  db.mpesa_till_number   || '',
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const cfg = await loadConfig(supabase);
    if (!cfg.key || !cfg.secret || !cfg.passkey) {
      return NextResponse.json({ error: 'M-Pesa not configured. Save credentials in Finance → M-Pesa Config.' }, { status: 503 });
    }

    const body = await req.json();
    const { phone, amount, studentId, studentName, accountRef, receiptNo } = body;
    if (!phone || !amount) return NextResponse.json({ error: 'Phone and amount required' }, { status: 400 });

    const normPhone = normalizePhone(String(phone));
    if (!/^254[0-9]{9}$/.test(normPhone))
      return NextResponse.json({ error: 'Invalid phone. Use 07XXXXXXXX format' }, { status: 400 });

    const amt = Math.ceil(Number(amount));
    if (isNaN(amt) || amt < 1) return NextResponse.json({ error: 'Amount must be at least KES 1' }, { status: 400 });

    const BASE = cfg.environment === 'sandbox'
      ? 'https://sandbox.safaricom.co.ke'
      : 'https://api.safaricom.co.ke';

    // Get access token
    const auth = Buffer.from(`${cfg.key}:${cfg.secret}`).toString('base64');
    const tokenRes = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` },
    });
    if (!tokenRes.ok) throw new Error(`Token failed: ${tokenRes.status}`);
    const { access_token } = await tokenRes.json();
    if (!access_token) throw new Error('No access token from Safaricom');

    const timestamp = ts();
    const isTill   = cfg.accountType.toLowerCase() === 'till';
    const partyB   = isTill ? (cfg.tillNumber || cfg.shortcode) : cfg.shortcode;
    const txnType  = isTill ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline';
    const password = b64(cfg.shortcode, cfg.passkey, timestamp);

    const payload = {
      BusinessShortCode: cfg.shortcode,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   txnType,
      Amount:            amt,
      PartyA:            normPhone,
      PartyB:            partyB,
      PhoneNumber:       normPhone,
      CallBackURL:       cfg.callbackUrl,
      AccountReference:  accountRef || receiptNo || `SCH-${studentId || Date.now()}`,
      TransactionDesc:   studentName ? `School Fees - ${studentName}` : 'School Fee Payment',
    };

    const stkRes = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await stkRes.json();

    if (result.ResponseCode !== '0') {
      return NextResponse.json({ error: result.ResponseDescription || 'STK rejected by Safaricom' }, { status: 400 });
    }

    // Save to school_mpesa_transactions
    try {
      const { error: dbErr } = await supabase.from('school_mpesa_transactions').insert([{
        merchant_request_id: result.MerchantRequestID,
        checkout_request_id: result.CheckoutRequestID,
        amount:              amt,
        phone:               normPhone,
        student_id:          studentId || null,
        status:              'pending',
        result_code:         0,
        result_desc:         'STK Push initiated',
      }]);
      if (dbErr) console.error('TX insert error:', dbErr.message);
    } catch(e:any) { console.warn('TX insert failed:', e.message); }

    // Return format compatible with UltraPaymentModal expectations
    return NextResponse.json({
      success:              true,
      ResponseCode:         '0',
      CheckoutRequestID:    result.CheckoutRequestID,
      MerchantRequestID:    result.MerchantRequestID,
      checkoutRequestId:    result.CheckoutRequestID,
      ResponseDescription:  result.ResponseDescription,
    });

  } catch (err: any) {
    console.error('STK Push error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

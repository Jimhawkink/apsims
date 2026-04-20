import { NextRequest, NextResponse } from 'next/server';

const MPESA_BASE = process.env.MPESA_ENV === 'live' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke';

async function getAccessToken() {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
  
  const res = await fetch(`${MPESA_BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await res.json();
  return data.access_token;
}

function generateTimestamp() {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function generatePassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, amount, account_reference, transaction_desc, student_id } = body;

    if (!phone || !amount) {
      return NextResponse.json({ error: 'Phone and amount required' }, { status: 400 });
    }

    const shortcode = process.env.MPESA_SHORTCODE || '174379';
    const passkey = process.env.MPESA_PASSKEY || 'bfb279f9aa9bdba158e5dd3c2e7f3b2d7f3e3e3e3e3e3e3e3e3e3e3e3e3e3e3e';
    
    const timestamp = generateTimestamp();
    const password = generatePassword(shortcode, passkey, timestamp);
    const accessToken = await getAccessToken();

    const stkPayload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(Number(amount)),
      PartyA: phone.startsWith('0') ? `254${phone.slice(1)}` : phone,
      PartyB: shortcode,
      PhoneNumber: phone.startsWith('0') ? `254${phone.slice(1)}` : phone,
      CallBackURL: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://apsims.vercel.app'}/api/mpesa/callback`,
      AccountReference: account_reference || `SCH-${Date.now()}`,
      TransactionDesc: transaction_desc || 'School Fee Payment',
    };

    const response = await fetch(`${MPESA_BASE}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    });

    const result = await response.json();

    // Log to Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.from('school_mpesa_transactions').insert([{
      merchant_request_id: result.MerchantRequestID,
      checkout_request_id: result.CheckoutRequestID,
      amount: Number(amount),
      phone_number: phone,
      student_id: student_id || null,
      account_reference: stkPayload.AccountReference,
      transaction_desc: stkPayload.TransactionDesc,
      status: result.ResponseCode === '0' ? 'processing' : 'failed',
      result_code: result.ResponseCode,
      result_desc: result.ResponseDescription,
    }]);

    // Update payment attempt
    if (student_id) {
      await supabase.from('school_payment_attempts').insert([{
        student_id,
        amount: Number(amount),
        channel: 'mpesa_stk',
        phone_number: phone,
        account_reference: stkPayload.AccountReference,
        external_ref: result.CheckoutRequestID,
        status: 'processing',
      }]);
    }

    return NextResponse.json({
      success: result.ResponseCode === '0',
      checkout_request_id: result.CheckoutRequestID,
      merchant_request_id: result.MerchantRequestID,
      message: result.ResponseCode === '0' ? 'STK push initiated' : result.ResponseDescription,
    });
  } catch (error: any) {
    console.error('M-Pesa STK Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';

const JENGA_BASE = process.env.JENGA_ENV === 'live'
  ? 'https://api.finserve.co.ke'
  : 'https://uat.finserve.co.ke';

async function getJengaToken() {
  const res = await fetch(`${JENGA_BASE}/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.JENGA_CLIENT_ID,
      client_secret: process.env.JENGA_CLIENT_SECRET,
      grant_type: 'client_credentials',
    }),
  });
  const data = await res.json();
  return data.access_token;
}

export async function POST(req: NextRequest) {
  try {
    // ─── Auth + CSRF Check ───
    const { getSession, validateCsrf } = await import('@/lib/auth');
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const csrfToken = req.headers.get('x-csrf-token');
    const csrfValid = await validateCsrf(csrfToken);
    if (!csrfValid) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

    const body = await req.json();
    const { amount, phone, student_id, account_reference } = body;

    if (!amount || !phone) {
      return NextResponse.json({ error: 'Amount and phone required' }, { status: 400 });
    }

    const accessToken = await getJengaToken();
    const transactionRef = `JNG-${Date.now()}`;

    const payload = {
      customer: { mobileNumber: phone.startsWith('0') ? `254${phone.slice(1)}` : phone },
      transaction: {
        amount: Number(amount),
        currency: 'KES',
        reference: account_reference || transactionRef,
        description: 'School Fee Payment',
      },
    };

    const response = await fetch(`${JENGA_BASE}/v1/payments/stk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Partner-ID': process.env.JENGA_PARTNER_ID || '',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.from('school_jenga_transactions').insert([{
      transaction_ref: transactionRef,
      jenga_ref: result.transactionRef || null,
      amount: Number(amount),
      phone_number: phone,
      student_id: student_id || null,
      status: result.statusCode === 0 ? 'processing' : 'failed',
      callback_data: result,
    }]);

    if (student_id) {
      await supabase.from('school_payment_attempts').insert([{
        student_id,
        amount: Number(amount),
        channel: 'jenga',
        phone_number: phone,
        account_reference: account_reference || transactionRef,
        external_ref: transactionRef,
        internal_ref: transactionRef,
        status: 'processing',
      }]);
    }

    return NextResponse.json({
      success: result.statusCode === 0,
      transaction_ref: transactionRef,
      message: result.message || 'Jenga payment initiated',
    });
  } catch (error: any) {
    console.error('Jenga Pay Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

const KCB_BASE = process.env.KCB_ENV === 'live'
  ? 'https://api.kcbbankgroup.com'
  : 'https://sandbox.kcbbankgroup.com';

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

    const transactionRef = `KCB-${Date.now()}`;
    const apiKey = process.env.KCB_API_KEY || '';
    const apiSecret = process.env.KCB_API_SECRET || '';
    const merchantId = process.env.KCB_MERCHANT_ID || '';

    const payload = {
      merchantId,
      transactionReference: transactionRef,
      amount: Number(amount),
      currency: 'KES',
      phoneNumber: phone.startsWith('0') ? `254${phone.slice(1)}` : phone,
      accountReference: account_reference || `SCH-${Date.now()}`,
      transactionDesc: 'School Fee Payment',
      callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://apsims.vercel.app'}/api/kcb/callback`,
    };

    const response = await fetch(`${KCB_BASE}/v1/payments/stk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'X-API-Secret': apiSecret,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    await supabase.from('school_kcb_transactions').insert([{
      transaction_ref: transactionRef,
      kcb_ref: result.transactionId || null,
      amount: Number(amount),
      phone_number: phone,
      student_id: student_id || null,
      payment_method: 'stk',
      status: result.status === 'SUCCESS' ? 'processing' : 'failed',
      callback_data: result,
    }]);

    if (student_id) {
      await supabase.from('school_payment_attempts').insert([{
        student_id,
        amount: Number(amount),
        channel: 'kcb',
        phone_number: phone,
        account_reference: account_reference || transactionRef,
        external_ref: transactionRef,
        status: 'processing',
      }]);
    }

    return NextResponse.json({
      success: result.status === 'SUCCESS',
      transaction_ref: transactionRef,
      message: result.message || 'KCB payment initiated',
    });
  } catch (error: any) {
    console.error('KCB Pay Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

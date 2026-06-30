export const dynamic = 'force-dynamic';
// /api/mpesa/stk-status — Polls transaction status for UltraPaymentModal
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const checkoutId = searchParams.get('checkoutId');

    if (!checkoutId) {
      return NextResponse.json({ error: 'checkoutId required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('school_mpesa_transactions')
      .select('status, mpesa_receipt, result_code, result_desc')
      .eq('checkout_request_id', checkoutId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json({ status: 'pending', ResultCode: null });
    }

    // Map to format expected by UltraPaymentModal
    // Modal checks: status.ResultCode === '0' for success
    const isSuccess = data.status === 'success';
    const isFailed  = data.status === 'failed';

    return NextResponse.json({
      status:              data.status || 'pending',
      ResultCode:          isSuccess ? '0' : (isFailed ? '1' : null),
      MpesaReceiptNumber:  data.mpesa_receipt || null,
      ResultDesc:          data.result_desc || '',
    });

  } catch (err: any) {
    console.error('STK status error:', err.message);
    return NextResponse.json({ error: err.message, status: 'pending' }, { status: 500 });
  }
}

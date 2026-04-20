import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const callbackData = body?.Body?.stkCallback;
    if (!callbackData) {
      return NextResponse.json({ error: 'Invalid callback format' }, { status: 400 });
    }

    const checkoutRequestId = callbackData.CheckoutRequestID;
    const merchantRequestId = callbackData.MerchantRequestID;
    const resultCode = callbackData.ResultCode;
    const resultDesc = callbackData.ResultDesc;

    // Find the existing transaction
    const { data: existing } = await supabase
      .from('school_mpesa_transactions')
      .select('*')
      .eq('checkout_request_id', checkoutRequestId)
      .single();

    if (!existing) {
      console.error('Transaction not found for checkout:', checkoutRequestId);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Extract payment details if successful
    let mpesaReceipt = null;
    let transactionDate = null;
    let phone = null;
    let paidAmount = null;

    if (resultCode === 0 && callbackData.CallbackMetadata) {
      const items = callbackData.CallbackMetadata.Item || [];
      for (const item of items) {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
        if (item.Name === 'TransactionDate') transactionDate = String(item.Value);
        if (item.Name === 'PhoneNumber') phone = String(item.Value);
        if (item.Name === 'Amount') paidAmount = Number(item.Value);
      }
    }

    // Update M-Pesa transaction
    await supabase.from('school_mpesa_transactions').update({
      result_code: String(resultCode),
      result_desc: resultDesc,
      mpesa_receipt: mpesaReceipt,
      transaction_date: transactionDate,
      msisdn: phone,
      status: resultCode === 0 ? 'completed' : 'failed',
      callback_received: true,
      raw_callback: body,
      matched: !!mpesaReceipt,
      matched_at: resultCode === 0 ? new Date().toISOString() : null,
    }).eq('id', existing.id);

    // Update payment attempt
    if (existing.student_id) {
      await supabase.from('school_payment_attempts').update({
        status: resultCode === 0 ? 'completed' : 'failed',
        callback_received: true,
        callback_data: body,
        external_ref: mpesaReceipt || checkoutRequestId,
      }).eq('student_id', existing.student_id)
        .eq('external_ref', checkoutRequestId);
    }

    // If successful, create a fee payment record
    if (resultCode === 0 && paidAmount && existing.student_id) {
      const { data: student } = await supabase
        .from('school_students')
        .select('id')
        .eq('id', existing.student_id)
        .single();

      if (student) {
        await supabase.from('school_fee_payments').insert([{
          student_id: existing.student_id,
          amount_paid: paidAmount,
          payment_method: 'mpesa',
          mpesa_receipt: mpesaReceipt,
          mpesa_phone: phone,
          reference_no: existing.account_reference || checkoutRequestId,
          payment_date: new Date().toISOString().split('T')[0],
          notes: `Auto-matched from M-Pesa STK. Receipt: ${mpesaReceipt}`,
        }]);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('M-Pesa Callback Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'M-Pesa callback endpoint active' });
}

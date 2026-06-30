export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // IMPORTANT: Always return 200 to Safaricom or they will keep retrying
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
      console.error('Invalid callback format:', JSON.stringify(body));
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const checkoutRequestId = callbackData.CheckoutRequestID;
    const merchantRequestId = callbackData.MerchantRequestID;
    const resultCode       = Number(callbackData.ResultCode);
    const resultDesc       = callbackData.ResultDesc || '';

    // Find the existing transaction record
    const { data: existing, error: findErr } = await supabase
      .from('school_mpesa_transactions')
      .select('id, student_id, amount')
      .eq('checkout_request_id', checkoutRequestId)
      .maybeSingle();

    if (findErr) console.error('Find transaction error:', findErr.message);

    // Extract payment details if successful
    let mpesaReceipt: string | null    = null;
    let transactionDate: string | null = null;
    let paidAmount: number | null      = null;

    if (resultCode === 0 && callbackData.CallbackMetadata) {
      const items: any[] = callbackData.CallbackMetadata.Item || [];
      for (const item of items) {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceipt   = String(item.Value);
        if (item.Name === 'TransactionDate')    transactionDate = String(item.Value);
        if (item.Name === 'Amount')             paidAmount      = Number(item.Value);
      }
    }

    const newStatus = resultCode === 0 ? 'success' : 'failed'; // 'success' matches mobile poll

    // Update the transaction record (only columns that actually exist in the table)
    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('school_mpesa_transactions')
        .update({
          result_code:   resultCode,
          result_desc:   resultDesc,
          mpesa_receipt: mpesaReceipt,
          status:        newStatus,
        })
        .eq('id', existing.id);

      if (updateErr) console.error('Update transaction error:', updateErr.message);
    } else {
      // Transaction not found — insert it so the record exists
      console.warn('Transaction not found for checkout:', checkoutRequestId, '— inserting');
      await supabase.from('school_mpesa_transactions').insert([{
        checkout_request_id:  checkoutRequestId,
        merchant_request_id:  merchantRequestId,
        result_code:          resultCode,
        result_desc:          resultDesc,
        mpesa_receipt:        mpesaReceipt,
        amount:               paidAmount,
        status:               newStatus,
      }]);
    }

    // If successful, save to school_fee_payments
    if (resultCode === 0 && paidAmount && existing?.student_id) {
      const studentId = existing.student_id;

      const { error: feeErr } = await supabase.from('school_fee_payments').insert([{
        student_id:     studentId,
        amount:         paidAmount,
        amount_paid:    paidAmount,
        payment_method: 'M-Pesa',
        mpesa_receipt:  mpesaReceipt,
        reference_no:   checkoutRequestId,
        payment_date:   new Date().toISOString().split('T')[0],
        notes:          `Auto via M-Pesa STK. Receipt: ${mpesaReceipt}`,
      }]);

      if (feeErr) {
        console.error('Fee payment insert error:', feeErr.message);
      } else {
        console.log(`✅ Fee payment saved for student ${studentId} — KES ${paidAmount} — ${mpesaReceipt}`);
      }
    }

    // Always return 200 so Safaricom stops retrying
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

  } catch (error: any) {
    console.error('M-Pesa Callback Error:', error.message);
    // Still return 200 to Safaricom
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'M-Pesa callback endpoint active' });
}

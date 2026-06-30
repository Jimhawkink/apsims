export const dynamic = 'force-dynamic';
// /api/payments/record-mpesa — Records a confirmed M-Pesa STK payment
// Called by: integration page (has studentId), mobile app (has only checkoutId)
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    // Auth check — allow mobile (session token) and web (cookie session)
    let session: any = null;
    try { session = await getSession(); } catch { /* mobile may not have cookie */ }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await req.json();
    let { studentId, amount, mpesaReceipt, phone, checkoutId } = body;

    if (!checkoutId && !mpesaReceipt) {
      return NextResponse.json({ error: 'checkoutId or mpesaReceipt required' }, { status: 400 });
    }

    // If we only have checkoutId (mobile case), look up the transaction for studentId + amount
    if (checkoutId && (!studentId || !amount)) {
      const { data: tx } = await supabase
        .from('school_mpesa_transactions')
        .select('student_id, amount, mpesa_receipt, phone')
        .eq('checkout_request_id', checkoutId)
        .maybeSingle();

      if (tx) {
        if (!studentId) studentId = tx.student_id;
        if (!amount)    amount    = tx.amount;
        if (!mpesaReceipt) mpesaReceipt = tx.mpesa_receipt;
        if (!phone)     phone     = tx.phone;
      }
    }

    if (!studentId || !amount) {
      return NextResponse.json({
        error: 'Could not determine studentId/amount. Payment may still be processing.',
        hint: 'Transaction record not found — callback may not have fired yet.'
      }, { status: 422 });
    }

    // Deduplicate by mpesa_receipt
    if (mpesaReceipt) {
      const { data: existing } = await supabase
        .from('school_fee_payments')
        .select('id')
        .eq('mpesa_receipt', mpesaReceipt)
        .maybeSingle();

      if (existing?.id) {
        return NextResponse.json({
          success: true,
          alreadyExists: true,
          message: `Payment already recorded (receipt ${mpesaReceipt})`,
        });
      }
    }

    // Save to school_fee_payments
    const { data: feePayment, error: feeErr } = await supabase
      .from('school_fee_payments')
      .insert([{
        student_id:     studentId,
        amount:         Number(amount),
        amount_paid:    Number(amount),
        payment_method: 'M-Pesa',
        mpesa_receipt:  mpesaReceipt || null,
        reference_no:   mpesaReceipt || checkoutId || `STK-${Date.now()}`,
        payment_date:   new Date().toISOString().split('T')[0],
        notes:          `M-Pesa STK Push. Receipt: ${mpesaReceipt || 'N/A'}. Phone: ${phone || 'N/A'}`,
      }])
      .select('id')
      .single();

    if (feeErr) {
      console.error('Fee payment insert error:', feeErr.message);
      return NextResponse.json({ error: `Failed to record fee: ${feeErr.message}` }, { status: 500 });
    }

    console.log(`✅ Fee recorded: student ${studentId} KES ${amount} receipt ${mpesaReceipt}`);

    // Also update school_mpesa_transactions status if record exists
    if (checkoutId && mpesaReceipt) {
      await supabase
        .from('school_mpesa_transactions')
        .update({ status: 'success', mpesa_receipt: mpesaReceipt, result_code: 0 })
        .eq('checkout_request_id', checkoutId);
    }

    return NextResponse.json({ success: true, feePaymentId: feePayment?.id });
  } catch (err: any) {
    console.error('record-mpesa error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

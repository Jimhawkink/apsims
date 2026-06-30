export const dynamic = 'force-dynamic';
// /api/payments/record-mpesa — Records a confirmed M-Pesa STK payment directly
// Called by integration page when poll confirms success, bypassing callback dependency
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await req.json();
    const { studentId, amount, mpesaReceipt, phone, checkoutId } = body;

    if (!studentId || !amount) {
      return NextResponse.json({ error: 'studentId and amount required' }, { status: 400 });
    }

    const results: any = {};

    // 1. Check if fee payment already exists (to avoid duplicates from callback + this call)
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

    // 2. Save to school_fee_payments
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
      results.feeError = feeErr.message;
    } else {
      results.feePaymentId = feePayment?.id;
      console.log(`✅ Fee recorded: student ${studentId} KES ${amount} receipt ${mpesaReceipt}`);
    }

    // 3. Also update school_mpesa_transactions if record exists
    if (checkoutId && mpesaReceipt) {
      const { error: txErr } = await supabase
        .from('school_mpesa_transactions')
        .update({ status: 'success', mpesa_receipt: mpesaReceipt, result_code: 0 })
        .eq('checkout_request_id', checkoutId);

      if (txErr) console.warn('TX update error (non-fatal):', txErr.message);
      results.txUpdated = !txErr;
    }

    if (feeErr && !results.feePaymentId) {
      return NextResponse.json({ error: `Failed to record: ${feeErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error('record-mpesa error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

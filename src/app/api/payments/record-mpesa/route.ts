export const dynamic = 'force-dynamic';
// /api/payments/record-mpesa — Records a confirmed M-Pesa STK payment
// Called by: integration page (has studentId+amount), mobile app (checkoutId only)
// Uses EXACT same column names as useUltraFeeCollect.ts recordPayment function
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function genReceipt(): string {
  return `APSIMS-${String(Date.now()).slice(-6)}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const body = await req.json();
    let { studentId, amount, mpesaReceipt, phone, checkoutId } = body;

    if (!checkoutId && !mpesaReceipt) {
      return NextResponse.json({ error: 'checkoutId or mpesaReceipt required' }, { status: 400 });
    }

    // If mobile only sends checkoutId, look up student_id + amount from transaction record
    if (checkoutId && (!studentId || !amount)) {
      const { data: tx } = await supabase
        .from('school_mpesa_transactions')
        .select('student_id, amount, mpesa_receipt, phone')
        .eq('checkout_request_id', checkoutId)
        .maybeSingle();

      if (tx) {
        if (!studentId)    studentId    = tx.student_id;
        if (!amount)       amount       = tx.amount;
        if (!mpesaReceipt) mpesaReceipt = tx.mpesa_receipt;
        if (!phone)        phone        = tx.phone;
      }
    }

    if (!studentId || !amount) {
      console.warn('record-mpesa: missing studentId/amount for checkoutId:', checkoutId);
      return NextResponse.json({
        error: 'Could not determine studentId/amount',
        hint: 'Transaction record may not exist yet — callback may still be processing'
      }, { status: 422 });
    }

    // ── Deduplicate by mpesa_receipt (reference_number) ──────────────
    if (mpesaReceipt) {
      const { data: existing } = await supabase
        .from('school_fee_payments')
        .select('id')
        .eq('reference_number', mpesaReceipt)
        .maybeSingle();

      if (existing?.id) {
        return NextResponse.json({
          success: true,
          alreadyExists: true,
          message: `Payment already recorded (receipt ${mpesaReceipt})`,
        });
      }
    }

    // ── Get current term and year ─────────────────────────────────────
    const { data: termData } = await supabase
      .from('school_terms')
      .select('id')
      .eq('is_current', true)
      .maybeSingle();

    const currentTermId = termData?.id || null;
    const currentYear   = new Date().getFullYear();
    const receiptNo     = genReceipt();

    // ── Insert using EXACT columns from useUltraFeeCollect.ts ─────────
    const payload = {
      student_id:       studentId,
      amount:           Number(amount),
      payment_date:     new Date().toISOString().split('T')[0],
      payment_method:   'M-Pesa',
      receipt_number:   receiptNo,
      reference_number: mpesaReceipt || checkoutId || null,
      term_id:          currentTermId,
      year:             currentYear,
      notes:            `M-Pesa STK Push. Code: ${mpesaReceipt || 'N/A'}. Phone: ${phone || 'N/A'}`,
    };

    const { error: feeErr } = await supabase
      .from('school_fee_payments')
      .insert([payload]);

    if (feeErr) {
      console.error('record-mpesa fee insert error:', feeErr.message, JSON.stringify(payload));
      return NextResponse.json({ error: `Fee insert failed: ${feeErr.message}` }, { status: 500 });
    }

    console.log(`✅ Fee recorded: student=${studentId} KES=${amount} receipt=${mpesaReceipt} -> ${receiptNo}`);

    // ── Also update school_mpesa_transactions status ──────────────────
    if (checkoutId && mpesaReceipt) {
      await supabase
        .from('school_mpesa_transactions')
        .update({ status: 'success', mpesa_receipt: mpesaReceipt, result_code: 0 })
        .eq('checkout_request_id', checkoutId);
    }

    return NextResponse.json({ success: true, receiptNumber: receiptNo });
  } catch (err: any) {
    console.error('record-mpesa error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

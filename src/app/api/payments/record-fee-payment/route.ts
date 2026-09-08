// POST /api/payments/record-fee-payment
// Called by the mobile app AFTER it confirms a KCB payment succeeded.
// The app is authenticated and knows the studentId.
// We validate the receipt code exists in school_mpesa_transactions (KCB confirmed it).
// Then we write to school_fee_payments using service_role.
// This is the most reliable approach — no callback student-ID guessing needed.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const { studentId, receiptCode, amount, checkoutRequestId, phone } = await req.json();

        if (!studentId || !receiptCode || !amount) {
            return NextResponse.json(
                { error: 'Missing required fields: studentId, receiptCode, amount' },
                { status: 400 }
            );
        }

        // ── 1. Validate the receipt exists in school_mpesa_transactions ──
        // Look up by mpesa_receipt first, then by checkout_request_id as fallback
        let txn: any = null;
        const { data: txnByReceipt } = await supabase
            .from('school_mpesa_transactions')
            .select('id, amount, status, mpesa_receipt, checkout_request_id')
            .eq('mpesa_receipt', String(receiptCode).trim())
            .maybeSingle();
        txn = txnByReceipt;

        if (!txn && checkoutRequestId) {
            const { data: txnByCheckout } = await supabase
                .from('school_mpesa_transactions')
                .select('id, amount, status, mpesa_receipt, checkout_request_id')
                .eq('checkout_request_id', String(checkoutRequestId).trim())
                .maybeSingle();
            txn = txnByCheckout;
        }

        if (!txn) {
            console.error('[record-fee-payment] Receipt not found:', receiptCode, 'checkoutId:', checkoutRequestId);
            return NextResponse.json(
                { error: 'Receipt code not confirmed by KCB. Payment not recorded.' },
                { status: 422 }
            );
        }

        // ── 2. Check for duplicate (already recorded) ──
        const { data: existing } = await supabase
            .from('school_fee_payments')
            .select('id')
            .or(`receipt_number.eq.${receiptCode},mpesa_code.eq.${receiptCode}`)
            .maybeSingle();

        if (existing) {
            console.log('[record-fee-payment] Already recorded:', receiptCode);
            return NextResponse.json({ success: true, message: 'Payment already recorded', duplicate: true });
        }

        // ── 3. Write to school_fee_payments ──
        const paidAmount = Number(txn.amount || amount);
        const { error: insertErr } = await supabase.from('school_fee_payments').insert([{
            student_id:     Number(studentId),
            amount:         paidAmount,
            payment_date:   new Date().toISOString().split('T')[0],
            payment_method: 'KCB',
            receipt_number: String(receiptCode),
            mpesa_code:     String(receiptCode),
            notes:          `KCB Buni M-Pesa. Code: ${receiptCode}. Phone: ${phone || 'N/A'}. CheckoutID: ${checkoutRequestId || 'N/A'}`,
            year:           new Date().getFullYear(),
            created_at:     new Date().toISOString(),
        }]);

        if (insertErr) {
            console.error('[record-fee-payment] Insert error:', insertErr.message);
            return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
        }

        // ── 4. Update school_mpesa_transactions with student_id and phone ──
        if (checkoutRequestId) {
            await supabase
                .from('school_mpesa_transactions')
                .update({
                    student_id:   Number(studentId),
                    phone_number: phone || null,
                    updated_at:   new Date().toISOString(),
                })
                .eq('mpesa_receipt', String(receiptCode));
        }

        console.log('[record-fee-payment] Recorded: student', studentId, 'KES', paidAmount, 'code', receiptCode);
        return NextResponse.json({ success: true, amount: paidAmount, receipt: receiptCode });

    } catch (err: any) {
        console.error('[record-fee-payment] Error:', err.message);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

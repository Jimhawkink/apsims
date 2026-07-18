// ═══════════════════════════════════════════════════════════════
// KCB Buni STK Push Callback Handler
// POST /api/payments/kcb-callback
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[KCB Callback] RAW:', JSON.stringify(body));

        // Parse all possible KCB callback shapes
        const stkCallback = body?.Body?.stkCallback || body?.body?.stkCallback;
        const flat   = body?.body || body;
        const header = body?.header || {};

        // Extract CheckoutRequestID
        const checkoutRequestId =
            stkCallback?.CheckoutRequestID ||
            flat?.CheckoutRequestID        ||
            flat?.checkoutRequestId        ||
            flat?.MerchantTransID          ||
            flat?.merchantTransId          || '';

        // Extract ResultCode — 0 = success
        const resultCode =
            stkCallback?.ResultCode ??
            flat?.ResultCode        ??
            flat?.resultCode        ??
            flat?.ResponseCode      ??
            header?.responseCode    ?? -1;

        const isSuccess =
            resultCode === 0    || resultCode === '0'  ||
            flat?.Status === 'Success'                 ||
            flat?.status === 'Success'                 ||
            flat?.Status === 'COMPLETED';

        // Extract real M-Pesa transaction code (e.g. QFX12345AB)
        let receiptNo  = flat?.TransactionID        ||
                         flat?.transactionId        ||
                         flat?.ReceiptNo            ||
                         flat?.receiptNo            ||
                         flat?.MpesaReceiptNumber   || '';
        let paidAmount = Number(flat?.Amount || flat?.amount || 0);
        let msisdn     = flat?.MSISDN || flat?.msisdn || flat?.PhoneNumber || '';

        // Daraja-style CallbackMetadata (most reliable)
        const metaItems = stkCallback?.CallbackMetadata?.Item || flat?.CallbackMetadata?.Item || [];
        for (const item of metaItems) {
            if (item.Name === 'MpesaReceiptNumber') receiptNo  = String(item.Value || '');
            if (item.Name === 'Amount')              paidAmount = Number(item.Value || 0);
            if (item.Name === 'PhoneNumber')         msisdn     = String(item.Value || '');
        }

        console.log('[KCB Callback] CheckoutID:', checkoutRequestId,
                    '| Success:', isSuccess, '| Code:', receiptNo, '| Amount:', paidAmount);

        if (!checkoutRequestId) {
            console.error('[KCB Callback] No CheckoutRequestID — ignoring');
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });
        }

        // ── 1. Update school_mpesa_transactions with result ──
        // IMPORTANT: write lowercase 'success'/'failed' — mobile app polls for lowercase!
        const { data: txn, error: txnErr } = await supabase
            .from('school_mpesa_transactions')
            .update({
                status:      isSuccess ? 'success' : 'failed',  // lowercase to match app polling
                mpesa_receipt: receiptNo || null,                // correct column name
                result_code:   String(resultCode),
                result_desc:   stkCallback?.ResultDesc || flat?.ResultDesc || flat?.resultDesc || '',
                updated_at:    new Date().toISOString(),
            })
            .eq('checkout_request_id', checkoutRequestId)
            .select('student_id, amount')
            .maybeSingle();

        if (txnErr) console.error('[KCB Callback] txn update error:', txnErr.message);
        console.log('[KCB Callback] school_mpesa_transactions updated:', isSuccess ? 'success' : 'failed',
                    '| receipt:', receiptNo, '| student:', txn?.student_id);


        const studentId = txn?.student_id;
        const txnAmount = paidAmount || txn?.amount || 0;


        if (isSuccess && studentId && txnAmount > 0 && receiptNo) {
            // ── 2. SUCCESS: Insert confirmed payment into school_fee_payments ──
            // Deduplicate: check if this receipt code was already recorded
            const { data: existing } = await supabase
                .from('school_fee_payments')
                .select('id')
                .eq('receipt_number', receiptNo)
                .maybeSingle();

            if (!existing) {
                const { error: insertErr } = await supabase.from('school_fee_payments').insert([{
                    student_id:     studentId,
                    amount:         txnAmount,
                    payment_date:   new Date().toISOString().split('T')[0],
                    payment_method: 'KCB',
                    receipt_number: receiptNo,
                    mpesa_code:     receiptNo,
                    notes:          `KCB confirmed. M-Pesa Code: ${receiptNo}. CheckoutID: ${checkoutRequestId}`,
                    year:           new Date().getFullYear(),
                    created_at:     new Date().toISOString(),
                }]);
                if (insertErr) console.error('[KCB Callback] fee insert error:', insertErr.message);
                else console.log(`[KCB Callback] ✅ Fee recorded: student=${studentId} KES${txnAmount} code=${receiptNo}`);
            } else {
                console.log('[KCB Callback] Fee already recorded for receipt:', receiptNo);
            }

        } else if (!isSuccess) {
            // ── 3. FAILED/CANCELLED: Clean up any pending fee_payments with this checkoutId ──
            // The kcb-stk route no longer pre-inserts, but clean up any old initiated records
            const { error: delErr } = await supabase
                .from('school_fee_payments')
                .delete()
                .eq('receipt_number', checkoutRequestId)  // ws_CO_... initiated records
                .ilike('notes', '%Initiated%');            // only delete initiated, not confirmed

            if (!delErr) console.log('[KCB Callback] ❌ Cleaned up pending record for:', checkoutRequestId);
            console.log('[KCB Callback] Payment FAILED. Code:', resultCode,
                        '| Desc:', stkCallback?.ResultDesc || flat?.ResultDesc || '');
        }

        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    } catch (err: any) {
        console.error('[KCB Callback] Error:', err.message);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });
    }
}

export async function GET() {
    return NextResponse.json({ status: 'KCB Buni Callback Active', system: 'APSIMS' });
}

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
                status:        isSuccess ? 'success' : 'failed',
                mpesa_receipt: receiptNo || null,
                result_code:   String(resultCode),
                result_desc:   stkCallback?.ResultDesc || flat?.ResultDesc || flat?.resultDesc || '',
                updated_at:    new Date().toISOString(),
            })
            .eq('checkout_request_id', checkoutRequestId)
            .select('student_id, amount')
            .maybeSingle();

        if (txnErr) console.error('[KCB Callback] txn update error:', txnErr.message);

        // ✔ If UPDATE found nothing (ID mismatch between initiation and callback),
        // INSERT a fresh record so the status API can find it by ws_CO_ ID
        if (!txn && checkoutRequestId) {
            await supabase.from('school_mpesa_transactions').insert([{
                checkout_request_id:  checkoutRequestId,
                merchant_request_id:  flat?.MerchantRequestID || flat?.merchantRequestId || '',
                status:               isSuccess ? 'success' : 'failed',
                mpesa_receipt:        receiptNo || null,
                result_code:          String(resultCode),
                result_desc:          stkCallback?.ResultDesc || flat?.ResultDesc || flat?.resultDesc || '',
                amount:               paidAmount || null,
                created_at:           new Date().toISOString(),
                updated_at:           new Date().toISOString(),
            }]);
            console.log('[KCB Callback] Inserted new school_mpesa_transactions record for:', checkoutRequestId);
        }

        console.log('[KCB Callback] school_mpesa_transactions:', isSuccess ? 'success' : 'failed',
                    '| receipt:', receiptNo, '| student:', txn?.student_id);

        // ── 2. Resolve student_id: from UPDATE, Pending record, or phone number ──
        let studentId = txn?.student_id;
        const txnAmount = paidAmount || Number(txn?.amount || 0);

        if (!studentId) {
            // FALLBACK 1: Look up the most recent Pending initiated record for student_id
            const { data: pendingTxn } = await supabase
                .from('school_mpesa_transactions')
                .select('student_id, checkout_request_id')
                .eq('status', 'Pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (pendingTxn?.student_id) {
                studentId = pendingTxn.student_id;
                console.log('[KCB Callback] Found student_id from pending record:', studentId);
                // Update the Pending record to final status
                await supabase
                    .from('school_mpesa_transactions')
                    .update({
                        status:        isSuccess ? 'success' : 'failed',
                        mpesa_receipt: receiptNo || null,
                        result_code:   String(resultCode),
                        result_desc:   stkCallback?.ResultDesc || flat?.ResultDesc || '',
                        updated_at:    new Date().toISOString(),
                    })
                    .eq('checkout_request_id', pendingTxn.checkout_request_id);
            }
        }

        // NOTE: No phone-number fallback — anyone can pay from any phone.
        // student_id MUST come from the Pending record written at initiation time.
        // If still null here, log it for admin review but do NOT assign to a student.
        if (!studentId) {
            console.warn('[KCB Callback] student_id unknown. Receipt:', receiptNo, 'Amount:', txnAmount,
                         '— admin must manually reconcile this payment.');
        }

        if (isSuccess && studentId && txnAmount > 0 && receiptNo) {
            // ── 3. SUCCESS: Insert confirmed payment into school_fee_payments ──
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
            console.log('[KCB Callback] ❌ Payment FAILED. Code:', resultCode,
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

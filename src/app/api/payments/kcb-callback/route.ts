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

        // ── 1. Update school_mpesa_transactions ──
        const { data: txn, error: txnErr } = await supabase
            .from('school_mpesa_transactions')
            .update({
                status:     isSuccess ? 'Success' : 'Failed',
                receipt_no: receiptNo,
                updated_at: new Date().toISOString(),
            })
            .eq('checkout_request_id', checkoutRequestId)
            .select('student_id, amount')
            .maybeSingle();

        if (txnErr) console.error('[KCB Callback] txn update error:', txnErr.message);

        // ── 2. Update the pre-saved school_fee_payments record with real M-Pesa code ──
        if (receiptNo) {
            const { error: feeUpdateErr } = await supabase
                .from('school_fee_payments')
                .update({
                    receipt_number: receiptNo,
                    notes: `KCB confirmed. M-Pesa Code: ${receiptNo}. CheckoutID: ${checkoutRequestId}`,
                })
                .eq('receipt_number', checkoutRequestId);  // find by ws_CO_ value

            if (feeUpdateErr) console.error('[KCB Callback] fee update error:', feeUpdateErr.message);
            else console.log('[KCB Callback] ✅ Pre-saved record updated with real code:', receiptNo);
        }

        const studentId = txn?.student_id;
        const txnAmount = paidAmount || txn?.amount || 0;

        // ── 3. If callback has new data not in pre-save, insert confirmed record ──
        if (isSuccess && studentId && txnAmount > 0 && receiptNo) {
            // Check if pre-save already exists (it will if kcb-stk worked)
            const { data: existing } = await supabase
                .from('school_fee_payments')
                .select('id')
                .eq('receipt_number', receiptNo)
                .maybeSingle();

            if (!existing) {
                // Pre-save didn't work — insert fresh confirmed record
                await supabase.from('school_fee_payments').insert([{
                    student_id:     studentId,
                    amount:         txnAmount,
                    payment_date:   new Date().toISOString().split('T')[0],
                    payment_method: 'KCB',
                    receipt_number: receiptNo,
                    phone_number:   msisdn,
                    transaction_id: checkoutRequestId,
                    notes:          `KCB Buni. M-Pesa: ${receiptNo}. CheckoutID: ${checkoutRequestId}`,
                    created_at:     new Date().toISOString(),
                }]);
                console.log(`[KCB Callback] ✅ New fee record: student=${studentId} KES${txnAmount} code=${receiptNo}`);
            }
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

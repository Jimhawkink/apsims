// ═══════════════════════════════════════════════════════════════
// KCB Buni STK Push Callback Handler
// POST /api/payments/kcb-callback
//
// KCB sends callback after user enters PIN.
// KCB uses Safaricom Daraja-style callback format:
// { Body: { stkCallback: { CheckoutRequestID, ResultCode, CallbackMetadata } } }
// OR flat format: { CheckoutRequestID, ResultCode, ... }
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
        console.log('[KCB Callback] Received:', JSON.stringify(body, null, 2));

        // Support multiple KCB callback shapes
        // Shape A (Daraja-style): { Body: { stkCallback: { CheckoutRequestID, ResultCode, ... } } }
        const stkCallback = body?.Body?.stkCallback || body?.body?.stkCallback;
        // Shape B (flat): { CheckoutRequestID, ResultCode, Amount, ... }
        // Shape C (KCB custom): { header: {...}, body: { MerchantTransID, Status, ... } }
        const flat    = body?.body || body;
        const header  = body?.header || {};

        // Extract CheckoutRequestID — try all possible locations
        const checkoutRequestId =
            stkCallback?.CheckoutRequestID ||
            flat?.CheckoutRequestID ||
            flat?.checkoutRequestId ||
            flat?.MerchantTransID   ||
            flat?.merchantTransId   || '';

        // Extract ResultCode
        const resultCode =
            stkCallback?.ResultCode ??
            flat?.ResultCode        ??
            flat?.resultCode        ??
            header?.responseCode    ??
            flat?.ResponseCode      ?? -1;

        const isSuccess = resultCode === 0 || resultCode === '0' ||
                          flat?.Status === 'Success' || flat?.status === 'Success' ||
                          flat?.Status === 'COMPLETED';

        // Extract receipt number from CallbackMetadata (Daraja style)
        let receiptNo = flat?.TransactionID || flat?.transactionId || flat?.ReceiptNo || '';
        let paidAmount = Number(flat?.Amount || flat?.amount || 0);
        let msisdn = flat?.MSISDN || flat?.msisdn || flat?.PhoneNumber || '';

        if (stkCallback?.CallbackMetadata?.Item) {
            for (const item of stkCallback.CallbackMetadata.Item) {
                if (item.Name === 'MpesaReceiptNumber') receiptNo  = String(item.Value || '');
                if (item.Name === 'Amount')              paidAmount = Number(item.Value || 0);
                if (item.Name === 'PhoneNumber')         msisdn     = String(item.Value || '');
            }
        }

        console.log('[KCB Callback] CheckoutID:', checkoutRequestId, '| Success:', isSuccess, '| Receipt:', receiptNo);

        if (!checkoutRequestId) {
            console.error('[KCB Callback] No CheckoutRequestID found in payload');
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });
        }

        // 1. Update transaction status in school_mpesa_transactions
        const { data: txn } = await supabase
            .from('school_mpesa_transactions')
            .update({
                status:       isSuccess ? 'Success' : 'Failed',
                receipt_no:   receiptNo,
                raw_callback: body,
                updated_at:   new Date().toISOString(),
            })
            .eq('checkout_request_id', checkoutRequestId)
            .select('student_id, amount')
            .maybeSingle();

        const studentId  = txn?.student_id;
        const txnAmount  = paidAmount || txn?.amount || 0;

        if (isSuccess && studentId && txnAmount > 0) {
            // 2. Get current term
            const { data: termData } = await supabase
                .from('school_terms')
                .select('id')
                .eq('is_current', true)
                .maybeSingle();

            // 3. Record fee payment
            const { error: payErr } = await supabase.from('school_fee_payments').insert([{
                student_id:      studentId,
                term_id:         termData?.id || null,
                amount:          txnAmount,
                payment_method:  'KCB',
                receipt_number:  receiptNo || checkoutRequestId,
                phone_number:    msisdn,
                transaction_id:  checkoutRequestId,
                status:          'Completed',
                payment_date:    new Date().toISOString(),
                notes:           `KCB Buni STK. Receipt: ${receiptNo}`,
                created_at:      new Date().toISOString(),
            }]);

            if (payErr) {
                console.error('[KCB Callback] Fee insert error:', payErr.message);
            } else {
                console.log(`[KCB Callback] ✅ Fee saved: student=${studentId} amount=KES${txnAmount} receipt=${receiptNo}`);
            }
        }

        // Always return 200 so KCB doesn't retry
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    } catch (err: any) {
        console.error('[KCB Callback] Error:', err.message);
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });
    }
}

// KCB may GET to verify the endpoint is alive
export async function GET() {
    return NextResponse.json({ status: 'KCB Buni Callback Active', system: 'APSIMS' });
}

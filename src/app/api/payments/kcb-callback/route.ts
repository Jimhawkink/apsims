// ═══════════════════════════════════════════════════════════════
// KCB Buni IPN (Instant Payment Notification) Callback Handler
// POST /api/payments/kcb-callback
//
// KCB sends this when payment completes or fails
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

        // KCB Buni callback shape:
        // { header: { responseCode, responseMessage }, body: { MerchantTransID, Status, Amount, MSISDN, TransactionID, ... } }
        const header = body?.header || {};
        const data   = body?.body   || body || {};

        const merchantTransId = data?.MerchantTransID || data?.merchantTransId || '';
        const status          = data?.Status          || data?.status          || '';
        const amount          = Number(data?.Amount   || data?.amount          || 0);
        const msisdn          = data?.MSISDN          || data?.msisdn          || '';
        const kcbReceiptNo    = data?.TransactionID   || data?.transactionId   || data?.ReceiptNo || '';
        const responseCode    = header?.responseCode  || data?.ResponseCode    || '0';

        const isSuccess = status === 'Success' || status === 'COMPLETED' || responseCode === '0' || responseCode === 0;

        if (!merchantTransId) {
            console.error('[KCB Callback] No MerchantTransID in payload');
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });
        }

        // 1. Update transaction record in school_mpesa_transactions
        await supabase
            .from('school_mpesa_transactions')
            .update({
                status:      isSuccess ? 'Success' : 'Failed',
                receipt_no:  kcbReceiptNo,
                raw_callback: body,
                updated_at:  new Date().toISOString(),
            })
            .eq('checkout_request_id', merchantTransId);

        if (isSuccess && amount > 0) {
            // 2. Find the student from the transaction
            const { data: txn } = await supabase
                .from('school_mpesa_transactions')
                .select('student_id, amount')
                .eq('checkout_request_id', merchantTransId)
                .maybeSingle();

            const studentId = txn?.student_id;

            if (studentId) {
                // 3. Get current term
                const { data: termData } = await supabase
                    .from('school_terms')
                    .select('id')
                    .eq('is_current', true)
                    .maybeSingle();

                // 4. Record the fee payment in school_fee_payments
                const { error: payErr } = await supabase.from('school_fee_payments').insert([{
                    student_id:      studentId,
                    term_id:         termData?.id || null,
                    amount:          amount,
                    payment_method:  'KCB',
                    receipt_number:  kcbReceiptNo || merchantTransId,
                    phone_number:    msisdn,
                    transaction_id:  merchantTransId,
                    status:          'Completed',
                    payment_date:    new Date().toISOString(),
                    notes:           `KCB Buni STK - ${kcbReceiptNo}`,
                    created_at:      new Date().toISOString(),
                }]);

                if (payErr) {
                    console.error('[KCB Callback] Fee payment insert error:', payErr.message);
                } else {
                    console.log(`[KCB Callback] ✅ Payment recorded: student=${studentId} amount=KES${amount} receipt=${kcbReceiptNo}`);
                }
            }
        }

        // Always return 200 OK so KCB doesn't retry
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    } catch (err: any) {
        console.error('[KCB Callback] Error:', err.message);
        // Still return 200 to prevent KCB from retrying
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });
    }
}

// KCB may also send GET to verify the endpoint
export async function GET() {
    return NextResponse.json({ status: 'KCB Buni Callback Endpoint Active', system: 'APSIMS' });
}

// ═══════════════════════════════════════════════════════════════
// KCB Buni STK Push Callback Handler
// POST /api/payments/kcb-callback
//
// KCB sends this after user enters PIN.
// Extracts MpesaReceiptNumber (e.g. QFX12345AB) and saves it.
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

        // ── Parse all possible KCB callback shapes ──────────────────
        // Shape A (Daraja-style): { Body: { stkCallback: { CheckoutRequestID, ResultCode, CallbackMetadata } } }
        const stkCallback = body?.Body?.stkCallback || body?.body?.stkCallback;
        // Shape B (flat / KCB custom): { CheckoutRequestID, ResultCode, TransactionID, ... }
        const flat   = body?.body || body;
        const header = body?.header || {};

        // CheckoutRequestID — try all locations
        const checkoutRequestId =
            stkCallback?.CheckoutRequestID ||
            flat?.CheckoutRequestID        ||
            flat?.checkoutRequestId        ||
            flat?.MerchantTransID          ||
            flat?.merchantTransId          || '';

        // ResultCode — 0 = success
        const resultCode =
            stkCallback?.ResultCode ??
            flat?.ResultCode        ??
            flat?.resultCode        ??
            flat?.ResponseCode      ??
            header?.responseCode    ?? -1;

        const isSuccess =
            resultCode === 0       || resultCode === '0'   ||
            flat?.Status === 'Success'                     ||
            flat?.status === 'Success'                     ||
            flat?.Status === 'COMPLETED';

        // ── Extract real M-Pesa transaction code ──────────────────
        // This is the code like QFX12345AB in the M-Pesa SMS
        let receiptNo  = flat?.TransactionID || flat?.transactionId ||
                         flat?.ReceiptNo     || flat?.receiptNo     ||
                         flat?.MpesaReceiptNumber || '';
        let paidAmount = Number(flat?.Amount || flat?.amount || 0);
        let msisdn     = flat?.MSISDN || flat?.msisdn || flat?.PhoneNumber || flat?.phoneNumber || '';

        // Daraja-style CallbackMetadata items (most reliable source)
        if (stkCallback?.CallbackMetadata?.Item) {
            for (const item of stkCallback.CallbackMetadata.Item) {
                if (item.Name === 'MpesaReceiptNumber') receiptNo  = String(item.Value || '');
                if (item.Name === 'Amount')              paidAmount = Number(item.Value || 0);
                if (item.Name === 'PhoneNumber')         msisdn     = String(item.Value || '');
            }
        }
        // Also check flat CallbackMetadata
        if (!receiptNo && flat?.CallbackMetadata?.Item) {
            for (const item of flat.CallbackMetadata.Item) {
                if (item.Name === 'MpesaReceiptNumber') receiptNo  = String(item.Value || '');
                if (item.Name === 'Amount')              paidAmount = Number(item.Value || 0);
                if (item.Name === 'PhoneNumber')         msisdn     = String(item.Value || '');
            }
        }

        console.log('[KCB Callback] CheckoutID:', checkoutRequestId,
                    '| Success:', isSuccess,
                    '| Receipt (real code):', receiptNo,
                    '| Amount:', paidAmount);

        if (!checkoutRequestId) {
            console.error('[KCB Callback] No CheckoutRequestID in payload — returning OK');
            return NextResponse.json({ ResultCode: 0, ResultDesc: 'OK' });
        }

        // ── 1. Update school_mpesa_transactions ──────────────────
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

        // ── 2. Update school_fee_payments pre-saved record ────────
        // The kcb-stk route pre-saves with receipt_number = checkoutRequestId
        // Now update it with the real M-Pesa receipt code
        const { error: feeUpdateErr } = await supabase
            .from('school_fee_payments')
            .update({
                receipt_number:  receiptNo || checkoutRequestId,
                reference_number: checkoutRequestId,
                status:          isSuccess ? 'Completed' : 'Failed',
                notes:           `KCB Buni confirmed. M-Pesa Code: ${receiptNo}. CheckoutID: ${checkoutRequestId}`,
            })
            .or(`receipt_number.eq.${checkoutRequestId},reference_number.eq.${checkoutRequestId}`);

        if (feeUpdateErr) console.error('[KCB Callback] fee update error:', feeUpdateErr.message);

        const studentId = txn?.student_id;
        const txnAmount = paidAmount || txn?.amount || 0;

        // ── 3. Insert confirmed fee payment if not already there ──
        if (isSuccess && studentId && txnAmount > 0 && receiptNo) {
            // Check if already saved (pre-save might have different record)
            const { data: existing } = await supabase
                .from('school_fee_payments')
                .select('id')
                .eq('receipt_number', receiptNo)
                .maybeSingle();

            if (!existing) {
                const { data: termData } = await supabase
                    .from('school_terms')
                    .select('id')
                    .eq('is_current', true)
                    .maybeSingle();

                await supabase.from('school_fee_payments').insert([{
                    student_id:       studentId,
                    term_id:          termData?.id || null,
                    amount:           txnAmount,
                    payment_method:   'KCB',
                    receipt_number:   receiptNo,       // Real M-Pesa code e.g. QFX12345AB
                    reference_number: checkoutRequestId,
                    phone_number:     msisdn,
                    transaction_id:   checkoutRequestId,
                    status:           'Completed',
                    payment_date:     new Date().toISOString().split('T')[0],
                    notes:            `KCB Buni. M-Pesa: ${receiptNo}. CheckoutID: ${checkoutRequestId}`,
                    created_at:       new Date().toISOString(),
                }]);
                console.log(`[KCB Callback] ✅ Fee saved: student=${studentId} KES${txnAmount} code=${receiptNo}`);
            }
        }

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

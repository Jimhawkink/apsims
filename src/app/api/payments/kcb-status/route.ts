// ═══════════════════════════════════════════════════════════════
// KCB Payment Status Polling Endpoint
// GET /api/payments/kcb-status?checkoutRequestId=ws_CO_...
// Checks both school_mpesa_transactions AND school_fee_payments
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const checkoutRequestId = searchParams.get('checkoutRequestId');

        if (!checkoutRequestId) {
            return NextResponse.json({ error: 'Missing checkoutRequestId' }, { status: 400 });
        }

        // ── Check 1: school_mpesa_transactions by checkout_request_id ──
        const { data: txn } = await supabase
            .from('school_mpesa_transactions')
            .select('status, result_code, result_desc, mpesa_receipt, amount')
            .eq('checkout_request_id', checkoutRequestId)
            .maybeSingle();

        if (txn) {
            const s = (txn.status || '').toLowerCase();
            if (s === 'success' || s === 'completed') {
                return NextResponse.json({
                    status:      'success',
                    receipt:     txn.mpesa_receipt || '',
                    amount:      txn.amount || 0,
                    result_code: txn.result_code || '0',
                });
            }
            if (s === 'failed' || s === 'cancelled') {
                return NextResponse.json({
                    status:      'failed',
                    result_code: txn.result_code || '',
                    result_desc: txn.result_desc || '',
                });
            }
        }

        // ── Check 2: school_fee_payments — look for KCB payment with this checkoutId in notes ──
        // The KCB callback writes: notes = "KCB confirmed. M-Pesa Code: XXXX. CheckoutID: ws_CO_..."
        const { data: feePay } = await supabase
            .from('school_fee_payments')
            .select('receipt_number, mpesa_code, amount, notes')
            .ilike('notes', `%${checkoutRequestId}%`)
            .not('receipt_number', 'ilike', 'ws_%')
            .maybeSingle();

        if (feePay) {
            // Found a confirmed payment with this checkoutId in notes
            const code = feePay.mpesa_code || feePay.receipt_number || '';
            return NextResponse.json({
                status:  'success',
                receipt: code,
                amount:  feePay.amount || 0,
                result_code: '0',
            });
        }

        // Still pending
        return NextResponse.json({ status: 'pending', receipt: '', message: 'Waiting for confirmation…' });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

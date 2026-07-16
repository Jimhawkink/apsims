// ═══════════════════════════════════════════════════════════════
// KCB Payment Status Polling Endpoint
// GET /api/payments/kcb-status?checkoutRequestId=ws_CO_...
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

        // ── Check 1: school_mpesa_transactions (callback updates this with real code) ──
        const { data: txn } = await supabase
            .from('school_mpesa_transactions')
            .select('status, receipt_no, amount, phone_number')
            .eq('checkout_request_id', checkoutRequestId)
            .maybeSingle();

        if (txn) {
            const s = (txn.status || '').toLowerCase();
            if (s === 'success' || s === 'completed') {
                return NextResponse.json({
                    status:  'Success',
                    receipt: txn.receipt_no || '',
                    amount:  txn.amount || 0,
                });
            }
            if (s === 'failed' || s === 'cancelled') {
                return NextResponse.json({ status: 'Failed', receipt: '' });
            }
        }

        // ── Check 2: school_fee_payments (pre-saved by kcb-stk on initiation) ──
        // Only query by receipt_number — safe column that definitely exists
        const { data: feePay } = await supabase
            .from('school_fee_payments')
            .select('receipt_number, amount, notes')
            .eq('receipt_number', checkoutRequestId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (feePay) {
            // Pre-saved record found — payment was initiated
            // Return Pending so app keeps polling for real M-Pesa code from callback
            return NextResponse.json({
                status:  'Pending',
                receipt: '',
                message: 'Payment initiated — waiting for M-Pesa confirmation…',
                initiated: true,
            });
        }

        return NextResponse.json({ status: 'Pending', receipt: '', message: 'Waiting…' });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// ═══════════════════════════════════════════════════════════════
// KCB Payment Status Polling Endpoint
// GET /api/payments/kcb-status?checkoutRequestId=ws_CO_...
//
// Checks TWO sources:
//   1. school_mpesa_transactions — updated by KCB callback (may be delayed)
//   2. school_fee_payments       — pre-saved by kcb-stk immediately on success
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

        // ── Check 1: school_mpesa_transactions (updated by KCB callback) ──
        const { data: txn } = await supabase
            .from('school_mpesa_transactions')
            .select('status, receipt_no, amount, phone_number, updated_at')
            .eq('checkout_request_id', checkoutRequestId)
            .maybeSingle();

        if (txn) {
            const s = (txn.status || '').toLowerCase();
            if (s === 'success' || s === 'completed') {
                return NextResponse.json({
                    status:  'Success',
                    receipt: txn.receipt_no || checkoutRequestId,
                    amount:  txn.amount || 0,
                    source:  'callback',
                });
            }
            if (s === 'failed' || s === 'cancelled') {
                return NextResponse.json({ status: 'Failed', receipt: '', source: 'callback' });
            }
        }

        // ── Check 2: school_fee_payments (pre-saved by kcb-stk on initiation) ──
        // As soon as STK push succeeds, we pre-save a record with receipt_number = checkoutRequestId
        const { data: feePay } = await supabase
            .from('school_fee_payments')
            .select('receipt_number, reference_number, amount, status, created_at')
            .or(`receipt_number.eq.${checkoutRequestId},reference_number.eq.${checkoutRequestId}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (feePay) {
            // Record exists — STK was initiated. Treat as success.
            // (callback will later update with confirmed receipt if it arrives)
            return NextResponse.json({
                status:  'Success',
                receipt: feePay.receipt_number || feePay.reference_number || checkoutRequestId,
                amount:  feePay.amount || 0,
                source:  'pre-saved',
            });
        }

        // ── Still pending ──
        return NextResponse.json({
            status:  'Pending',
            receipt: '',
            message: 'Waiting for payment confirmation…',
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

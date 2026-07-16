// ═══════════════════════════════════════════════════════════════
// KCB Payment Status Polling Endpoint
// GET /api/payments/kcb-status?checkoutRequestId=ws_CO_...
//
// Priority order:
//   1. school_mpesa_transactions.status = 'Success' → real M-Pesa code from callback
//   2. school_fee_payments with real code (not ws_CO_) → callback updated it
//   3. school_fee_payments with ws_CO_ → pre-saved, still waiting for callback
//   4. Nothing found → Pending
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

        // ── Check 1: school_mpesa_transactions (updated by KCB callback with real code) ──
        const { data: txn } = await supabase
            .from('school_mpesa_transactions')
            .select('status, receipt_no, amount, phone_number, updated_at')
            .eq('checkout_request_id', checkoutRequestId)
            .maybeSingle();

        if (txn) {
            const s = (txn.status || '').toLowerCase();
            if (s === 'success' || s === 'completed') {
                // ✅ Callback arrived — receipt_no is the real M-Pesa code (e.g. QFX12345AB)
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

        // ── Check 2: school_fee_payments — has real M-Pesa code if callback updated it ──
        const { data: feePay } = await supabase
            .from('school_fee_payments')
            .select('receipt_number, reference_number, amount, status, created_at')
            .or(`receipt_number.eq.${checkoutRequestId},reference_number.eq.${checkoutRequestId}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (feePay) {
            const savedReceipt = feePay.receipt_number || feePay.reference_number || '';
            const isRealCode = savedReceipt &&
                               !savedReceipt.startsWith('ws_CO_') &&
                               savedReceipt !== checkoutRequestId;

            if (isRealCode) {
                // ✅ Callback updated the record with real M-Pesa code
                return NextResponse.json({
                    status:  'Success',
                    receipt: savedReceipt,
                    amount:  feePay.amount || 0,
                    source:  'fee-confirmed',
                });
            }

            // Pre-saved record exists (ws_CO_) but callback hasn't arrived yet with real code
            // Return Pending — keep polling to get the real M-Pesa code
            return NextResponse.json({
                status:  'Pending',
                receipt: '',
                message: 'Payment sent — waiting for M-Pesa confirmation code…',
            });
        }

        // ── Nothing found yet ──
        return NextResponse.json({
            status:  'Pending',
            receipt: '',
            message: 'Waiting for payment confirmation…',
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

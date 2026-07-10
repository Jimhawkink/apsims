// ═══════════════════════════════════════════════════════════════
// KCB Payment Status Polling Endpoint
// GET /api/payments/kcb-status?checkoutRequestId=APSIMS-123-...
//
// Mobile polls this every 3s after STK push is sent
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

        const { data, error } = await supabase
            .from('school_mpesa_transactions')
            .select('status, receipt_no, amount, phone_number, updated_at')
            .eq('checkout_request_id', checkoutRequestId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return NextResponse.json({ status: 'Pending', message: 'Transaction not found yet' });

        return NextResponse.json({
            status:    data.status,     // 'Pending' | 'Success' | 'Failed'
            receipt:   data.receipt_no || '',
            amount:    data.amount || 0,
            phone:     data.phone_number || '',
            updatedAt: data.updated_at,
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

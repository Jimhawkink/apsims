// ═══════════════════════════════════════════════════════════════
// KCB Buni M-Pesa Express STK Push API
// POST /api/payments/kcb-stk
//
// KCB Buni Portal: https://sandbox.buni.kcbgroup.com
// API: MpesaExpressAPIService → /mm/api/request/1.0.0
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── KCB Buni config (add these to .env.local and Vercel env vars)
const KCB_CONSUMER_KEY    = process.env.KCB_CONSUMER_KEY!;
const KCB_CONSUMER_SECRET = process.env.KCB_CONSUMER_SECRET!;
const KCB_PAYBILL         = process.env.KCB_PAYBILL!;          // Your KCB Paybill number
const KCB_ACCOUNT_NUMBER  = process.env.KCB_ACCOUNT_NUMBER!;   // Your KCB account number
const KCB_MERCHANT_NAME   = process.env.KCB_MERCHANT_NAME || 'Alpha School';
const KCB_CALLBACK_URL    = process.env.KCB_CALLBACK_URL || 'https://apsims.vercel.app/api/payments/kcb-callback';

// Toggle sandbox/live
const IS_SANDBOX = process.env.KCB_ENV !== 'live';
const KCB_BASE   = IS_SANDBOX
    ? 'https://uat.buni.kcbgroup.com'
    : 'https://api.buni.kcbgroup.com';

// ── Step 1: Get OAuth2 access token from KCB Buni
async function getKCBToken(): Promise<string> {
    const credentials = Buffer.from(`${KCB_CONSUMER_KEY}:${KCB_CONSUMER_SECRET}`).toString('base64');
    const res = await fetch(`${KCB_BASE}/token`, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
        const errText = await res.text();
        throw new Error(`KCB token error: ${res.status} — ${errText}`);
    }

    const data = await res.json();
    return data.access_token;
}

// ── Step 2: Initiate STK Push
async function initiateSTKPush(token: string, params: {
    phone: string;
    amount: number;
    merchantTransId: string;
    referenceNo: string;
    studentId: number;
}): Promise<any> {
    const body = {
        MerchantTransID:    params.merchantTransId,
        MerchantAccount:    KCB_ACCOUNT_NUMBER,
        MerchantCallbackURL: KCB_CALLBACK_URL,
        CustomerMSISDN:     params.phone,
        Language:           'EN',
        Currency:           'KES',
        Amount:             String(Math.round(params.amount)),
        MerchantName:       KCB_MERCHANT_NAME,
        ReferenceNo:        params.referenceNo,
        Operator:           '63902',           // KCB Paybill operator code
        SendingCountryCode: 'KE',
        TransactionName:    'School Fee Payment',
    };

    console.log('[KCB STK] Initiating push:', { phone: params.phone, amount: params.amount, ref: params.referenceNo });

    const res = await fetch(`${KCB_BASE}/mm/api/request/1.0.0`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
            'x-Correlation-Id': uuidv4(),
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('[KCB STK] Response:', data);
    return data;
}

// ── Main handler
export async function POST(req: NextRequest) {
    try {
        const { phone, amount, studentId, description } = await req.json();

        // Validate required fields
        if (!phone || !amount || !studentId) {
            return NextResponse.json({ error: 'Missing required fields: phone, amount, studentId' }, { status: 400 });
        }
        if (!KCB_CONSUMER_KEY || !KCB_CONSUMER_SECRET) {
            return NextResponse.json({ error: 'KCB API not configured. Add KCB_CONSUMER_KEY and KCB_CONSUMER_SECRET to env vars.' }, { status: 500 });
        }

        // Normalize phone: 0712345678 → 254712345678
        const normalizedPhone = phone.startsWith('0')
            ? '254' + phone.slice(1)
            : phone.startsWith('+')
            ? phone.slice(1)
            : phone;

        // Generate unique transaction ID
        const merchantTransId = `APSIMS-${studentId}-${Date.now()}`;
        const referenceNo = `STU${studentId}`;

        // Get token then push
        const token = await getKCBToken();
        const result = await initiateSTKPush(token, {
            phone: normalizedPhone,
            amount: Number(amount),
            merchantTransId,
            referenceNo,
            studentId: Number(studentId),
        });

        // Log transaction to Supabase for polling
        const { error: logErr } = await supabase.from('school_mpesa_transactions').insert([{
            checkout_request_id: merchantTransId,
            merchant_request_id: result.requestId || merchantTransId,
            student_id:          studentId,
            amount:              Number(amount),
            phone_number:        normalizedPhone,
            status:              'Pending',
            payment_method:      'KCB',
            created_at:          new Date().toISOString(),
        }]);

        if (logErr) console.error('[KCB STK] DB log error:', logErr.message);

        // KCB returns { header: { responseCode, responseMessage }, body: {...} }
        const responseCode = result?.header?.responseCode || result?.ResponseCode || result?.statusCode;
        const responseMsg  = result?.header?.responseMessage || result?.ResponseDescription || '';

        if (responseCode === '0' || responseCode === 0 || responseCode === '200') {
            return NextResponse.json({
                success: true,
                checkoutRequestId: merchantTransId,
                message: 'STK Push sent. Please check your phone.',
            });
        }

        // Return error from KCB
        return NextResponse.json({
            error: responseMsg || `KCB error code: ${responseCode}`,
            raw: result,
        }, { status: 400 });

    } catch (err: any) {
        console.error('[KCB STK] Exception:', err.message);
        return NextResponse.json({ error: err.message || 'KCB STK Push failed' }, { status: 500 });
    }
}

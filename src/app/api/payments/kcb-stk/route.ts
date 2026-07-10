// ═══════════════════════════════════════════════════════════════
// KCB Buni M-Pesa Express STK Push API v2
// POST /api/payments/kcb-stk
//
// New KCB Buni Auth: API Key (JWT) — from Sandbox/Production Keys → API Key → GENERATE KEY
// Token endpoint: https://accounts.buni.kcbgroup.com/oauth2/token
// STK endpoint:   https://uat.buni.kcbgroup.com/mm/api/request/1.0.0 (sandbox)
//                 https://api.buni.kcbgroup.com/mm/api/request/1.0.0  (live)
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Built-in Node.js crypto — no external package needed
const genUUID = () => crypto.randomUUID();

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── KCB Buni config
const KCB_API_KEY         = process.env.KCB_API_KEY!;          // JWT from Buni → API Key → GENERATE KEY
const KCB_CLIENT_ID       = process.env.KCB_CLIENT_ID || '';   // OAuth2 client_id (if using OAuth2)
const KCB_CLIENT_SECRET   = process.env.KCB_CLIENT_SECRET || '';// OAuth2 client_secret (if using OAuth2)
const KCB_PAYBILL         = process.env.KCB_PAYBILL!;
const KCB_ACCOUNT_NUMBER  = process.env.KCB_ACCOUNT_NUMBER!;
const KCB_MERCHANT_NAME   = process.env.KCB_MERCHANT_NAME || 'Alpha School';
const KCB_CALLBACK_URL    = process.env.KCB_CALLBACK_URL || 'https://apsims.vercel.app/api/payments/kcb-callback';

const IS_SANDBOX   = process.env.KCB_ENV !== 'live';
const KCB_BASE     = IS_SANDBOX ? 'https://uat.buni.kcbgroup.com'     : 'https://api.buni.kcbgroup.com';
const KCB_AUTH_URL = IS_SANDBOX ? 'https://uat-accounts.buni.kcbgroup.com/oauth2/token' : 'https://accounts.buni.kcbgroup.com/oauth2/token';

// ── Get access token
// Method 1: API Key (JWT) — simplest, from Buni → API Key → GENERATE KEY
// Method 2: OAuth2 Client Credentials — from Buni → OAuth2 Tokens
async function getAccessToken(): Promise<string> {
    // If API Key (JWT) is provided, use it directly as Bearer token
    if (KCB_API_KEY && KCB_API_KEY.length > 10) {
        return KCB_API_KEY;
    }

    // OAuth2 Client Credentials flow
    if (KCB_CLIENT_ID && KCB_CLIENT_SECRET) {
        const credentials = Buffer.from(`${KCB_CLIENT_ID}:${KCB_CLIENT_SECRET}`).toString('base64');
        const res = await fetch(KCB_AUTH_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`KCB OAuth2 token error ${res.status}: ${err}`);
        }
        const data = await res.json();
        return data.access_token;
    }

    throw new Error('KCB credentials not configured. Set KCB_API_KEY (from Buni → API Key → Generate Key) in Vercel env vars.');
}

// ── Initiate STK Push
async function initiateSTKPush(accessToken: string, params: {
    phone: string;
    amount: number;
    merchantTransId: string;
    referenceNo: string;
}) {
    const body = {
        MerchantTransID:     params.merchantTransId,
        MerchantAccount:     KCB_ACCOUNT_NUMBER,
        MerchantCallbackURL: KCB_CALLBACK_URL,
        CustomerMSISDN:      params.phone,
        Language:            'EN',
        Currency:            'KES',
        Amount:              String(Math.round(params.amount)),
        MerchantName:        KCB_MERCHANT_NAME,
        ReferenceNo:         params.referenceNo,
        Operator:            '63902',
        SendingCountryCode:  'KE',
        TransactionName:     'School Fee Payment',
    };

    console.log('[KCB] STK Push request:', { phone: params.phone, amount: params.amount });

    const res = await fetch(`${KCB_BASE}/mm/api/request/1.0.0`, {
        method: 'POST',
        headers: {
            'Authorization':    `Bearer ${accessToken}`,
            'Content-Type':     'application/json',
            'x-Correlation-Id': genUUID(),
            'x-api-key':        KCB_API_KEY || '',  // Some endpoints need both
        },
        body: JSON.stringify(body),
    });

    const data = await res.json();
    console.log('[KCB] STK Response:', JSON.stringify(data));
    return { data, status: res.status };
}

export async function POST(req: NextRequest) {
    try {
        const { phone, amount, studentId, description } = await req.json();

        if (!phone || !amount || !studentId) {
            return NextResponse.json({ error: 'Missing: phone, amount, studentId' }, { status: 400 });
        }
        if (!KCB_API_KEY && (!KCB_CLIENT_ID || !KCB_CLIENT_SECRET)) {
            return NextResponse.json({
                error: 'KCB not configured. Go to Vercel → Environment Variables and add KCB_API_KEY (get it from Buni portal → Your Application → Sandbox Keys → API Key → Generate Key)',
            }, { status: 500 });
        }

        // Normalize phone: 0712345678 or +254712345678 → 254712345678
        const normalizedPhone = phone.replace(/^\+/, '').replace(/^0/, '254');

        const merchantTransId = `APSIMS-${studentId}-${Date.now()}`;
        const referenceNo     = `STU${studentId}`;

        // Get token
        const accessToken = await getAccessToken();

        // Send STK Push
        const { data: result, status: httpStatus } = await initiateSTKPush(accessToken, {
            phone:           normalizedPhone,
            amount:          Number(amount),
            merchantTransId,
            referenceNo,
        });

        // Log to Supabase
        await supabase.from('school_mpesa_transactions').insert([{
            checkout_request_id: merchantTransId,
            merchant_request_id: result?.requestId || merchantTransId,
            student_id:          studentId,
            amount:              Number(amount),
            phone_number:        normalizedPhone,
            status:              'Pending',
            payment_method:      'KCB',
            created_at:          new Date().toISOString(),
        }]).then(({ error: e }) => { if (e) console.error('[KCB] DB log error:', e.message); });

        // KCB success: responseCode "0" or "200" or status 200
        const responseCode = result?.header?.responseCode ?? result?.ResponseCode ?? result?.statusCode ?? result?.code;
        const isSuccess    = httpStatus === 200 || responseCode === '0' || responseCode === 0 || responseCode === '200';

        if (isSuccess) {
            return NextResponse.json({
                success:           true,
                checkoutRequestId: merchantTransId,
                message:           'STK Push sent! Check your phone for the M-Pesa prompt.',
            });
        }

        const errMsg = result?.header?.responseMessage || result?.ResponseDescription || result?.message || `KCB error: ${responseCode}`;
        return NextResponse.json({ error: errMsg, raw: result }, { status: 400 });

    } catch (err: any) {
        console.error('[KCB STK] Error:', err.message);
        return NextResponse.json({ error: err.message || 'KCB STK Push failed' }, { status: 500 });
    }
}

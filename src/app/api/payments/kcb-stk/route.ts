// ═══════════════════════════════════════════════════════════════
// KCB Buni M-Pesa Express STK Push
// POST /api/payments/kcb-stk
//
// Auth: OAuth2 Client Credentials → Bearer token
// Token URL: https://accounts.buni.kcbgroup.com/oauth2/token
// STK URL:   https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KCB_CONSUMER_KEY    = process.env.KCB_CONSUMER_KEY!;
const KCB_CONSUMER_SECRET = process.env.KCB_CONSUMER_SECRET!;
const KCB_ACCOUNT_NUMBER  = process.env.KCB_ACCOUNT_NUMBER || '8113915';
const KCB_PAYBILL         = process.env.KCB_PAYBILL || '522533';
const KCB_MERCHANT_NAME   = process.env.KCB_MERCHANT_NAME || 'Alpha School';
const KCB_CALLBACK_URL    = process.env.KCB_CALLBACK_URL || 'https://apsims.vercel.app/api/payments/kcb-callback';
const IS_SANDBOX          = process.env.KCB_ENV !== 'live';

// OAuth2 token endpoint (Identity Server)
const TOKEN_URL = IS_SANDBOX
    ? 'https://accounts.buni.kcbgroup.com/oauth2/token'   // same for sandbox
    : 'https://accounts.buni.kcbgroup.com/oauth2/token';

// STK Push endpoint (gateway)
const STK_URL = IS_SANDBOX
    ? 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush'
    : 'https://api.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush';

// ── Step 1: Get OAuth2 access token using Client Credentials
async function getOAuthToken(): Promise<string> {
    const credentials = Buffer.from(`${KCB_CONSUMER_KEY}:${KCB_CONSUMER_SECRET}`).toString('base64');

    const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type':  'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`OAuth token error ${res.status}: ${err}`);
    }
    const data = await res.json();
    if (!data.access_token) throw new Error('No access_token in OAuth response');
    return data.access_token;
}

// ── Step 2: Initiate STK Push
async function initiateSTKPush(token: string, params: {
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

    console.log('[KCB STK] Sending to:', STK_URL, { phone: params.phone, amount: params.amount });

    const res = await fetch(STK_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type':  'application/json',
        },
        body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('[KCB STK] Response:', res.status, text);

    let data: any = {};
    try { data = JSON.parse(text); } catch { data = { raw: text }; }
    return { data, httpStatus: res.status };
}

// ── Main handler
export async function POST(req: NextRequest) {
    try {
        const { phone, amount, studentId, description } = await req.json();

        if (!phone || !amount || !studentId) {
            return NextResponse.json({ error: 'Missing: phone, amount, studentId' }, { status: 400 });
        }
        if (!KCB_CONSUMER_KEY || !KCB_CONSUMER_SECRET) {
            return NextResponse.json({
                error: 'KCB not configured. Add KCB_CONSUMER_KEY and KCB_CONSUMER_SECRET in Vercel env vars.',
            }, { status: 500 });
        }

        // ── Robust phone normalization
        // Strip all spaces, dashes, brackets
        let normalizedPhone = String(phone).replace(/[\s\-\(\)]/g, '');
        // Remove leading +
        if (normalizedPhone.startsWith('+')) normalizedPhone = normalizedPhone.slice(1);
        // 0712345678 → 254712345678
        if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
        // If 9 digits with no country code e.g. 712345678 → 254712345678
        if (normalizedPhone.length === 9) normalizedPhone = '254' + normalizedPhone;

        // Validate: must be 254XXXXXXXXX (12 digits)
        if (!/^254[17]\d{8}$/.test(normalizedPhone)) {
            return NextResponse.json({
                error: `Invalid phone format. Enter your Safaricom number e.g. 0712345678 (got: ${normalizedPhone})`,
            }, { status: 400 });
        }

        console.log('[KCB] Phone normalized:', String(phone), '→', normalizedPhone);

        const merchantTransId = `APSIMS-${studentId}-${Date.now()}`;
        const referenceNo     = `STU${studentId}`;

        // Get OAuth token
        const token = await getOAuthToken();

        // Send STK Push
        const { data: result, httpStatus } = await initiateSTKPush(token, {
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
        }]).then(({ error: e }) => { if (e) console.error('[KCB] DB log:', e.message); });

        // KCB returns: { header: { statusCode: '0', statusDescription: 'Success' }, response: {...} }
        // statusCode '0' = success, anything else = error
        const statusCode  = result?.header?.statusCode;
        const statusDesc  = result?.header?.statusDescription || result?.message || result?.description || 'Unknown KCB error';
        const isSuccess   = httpStatus === 200 && (statusCode === '0' || statusCode === 0);

        console.log('[KCB] statusCode:', statusCode, '| httpStatus:', httpStatus, '| desc:', statusDesc);

        if (isSuccess) {
            return NextResponse.json({
                success:           true,
                checkoutRequestId: merchantTransId,
                message:           'STK Push sent! Check your phone for the M-Pesa prompt.',
            });
        }

        return NextResponse.json({ error: statusDesc, code: statusCode, raw: result }, { status: 400 });

    } catch (err: any) {
        console.error('[KCB STK] Error:', err.message);
        return NextResponse.json({ error: err.message || 'KCB STK Push failed' }, { status: 500 });
    }
}

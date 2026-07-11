// ═══════════════════════════════════════════════════════════════
// KCB Buni M-Pesa Express STK Push
// POST /api/payments/kcb-stk
//
// Auth:    OAuth2 Client Credentials → Bearer token
// Token:   https://uat.buni.kcbgroup.com/token
// STK URL: https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush
//
// CORRECT payload (from KCB Buni swagger spec STKPushRequest):
//   phoneNumber, amount, invoiceNumber, sharedShortCode,
//   orgShortCode, orgPassKey, callbackUrl, transactionDescription
// ═══════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const KCB_CONSUMER_KEY    = process.env.KCB_CONSUMER_KEY!;
const KCB_CONSUMER_SECRET = process.env.KCB_CONSUMER_SECRET!;
const KCB_ORG_SHORT_CODE  = process.env.KCB_PAYBILL || '522533';          // orgShortCode = paybill
const KCB_PASS_KEY        = process.env.KCB_PASS_KEY || '';                // orgPassKey — get from KCB support
const KCB_CALLBACK_URL    = process.env.KCB_CALLBACK_URL || 'https://apsims.vercel.app/api/payments/kcb-callback';

// Token & STK endpoints (from KCB official docs)
const TOKEN_URL = 'https://uat.buni.kcbgroup.com/token';
const STK_URL   = 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush';

// ── Duplicate prevention: KCB blocks same phone within ~90 seconds
const lastPushTime = new Map<string, number>();
const KCB_COOLDOWN_MS = 90_000;

// ── Step 1: Get OAuth2 Bearer token
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

// ── Step 2: Initiate STK Push with CORRECT KCB Buni payload fields
async function initiateSTKPush(token: string, params: {
    phone: string;
    amount: number;
    invoiceNumber: string;
}) {
    // CORRECT field names from KCB Buni STKPushRequest swagger schema
    const body = {
        phoneNumber:            params.phone,
        amount:                 String(Math.round(params.amount)),
        invoiceNumber:          params.invoiceNumber,
        sharedShortCode:        true,
        orgShortCode:           KCB_ORG_SHORT_CODE,
        orgPassKey:             KCB_PASS_KEY,
        callbackUrl:            KCB_CALLBACK_URL,
        transactionDescription: 'School Fee',          // max 13 chars
    };

    console.log('[KCB STK] Payload:', JSON.stringify(body));

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

        // ── Phone normalization → 254XXXXXXXXX
        let normalizedPhone = String(phone).replace(/[\s\-\(\)]/g, '');
        if (normalizedPhone.startsWith('+')) normalizedPhone = normalizedPhone.slice(1);
        if (normalizedPhone.startsWith('0')) normalizedPhone = '254' + normalizedPhone.slice(1);
        if (normalizedPhone.length === 9)    normalizedPhone = '254' + normalizedPhone;

        if (!/^254\d{9}$/.test(normalizedPhone)) {
            return NextResponse.json({
                error: `Invalid phone number format. Use your Safaricom number e.g. 0712345678 (got: ${normalizedPhone})`,
            }, { status: 400 });
        }

        console.log('[KCB] Phone:', String(phone), '→', normalizedPhone);

        // ── Duplicate prevention (KCB cooldown ~90s)
        const lastPush = lastPushTime.get(normalizedPhone);
        const now = Date.now();
        if (lastPush && (now - lastPush) < KCB_COOLDOWN_MS) {
            const waitSecs = Math.ceil((KCB_COOLDOWN_MS - (now - lastPush)) / 1000);
            return NextResponse.json({
                error: `STK push already sent. Check your phone for the M-Pesa prompt, or wait ${waitSecs}s to retry.`,
            }, { status: 429 });
        }

        const invoiceNumber = `APSIMS-${studentId}-${Date.now()}`;

        // Get token & send STK push
        const token = await getOAuthToken();
        const { data: result, httpStatus } = await initiateSTKPush(token, {
            phone:         normalizedPhone,
            amount:        Number(amount),
            invoiceNumber,
        });

        // Log to Supabase
        await supabase.from('school_mpesa_transactions').insert([{
            checkout_request_id: invoiceNumber,
            merchant_request_id: result?.response?.MerchantRequestID || invoiceNumber,
            student_id:          studentId,
            amount:              Number(amount),
            phone_number:        normalizedPhone,
            status:              'Pending',
            payment_method:      'KCB',
            created_at:          new Date().toISOString(),
        }]).then(({ error: e }) => { if (e) console.error('[KCB] DB log:', e.message); });

        // Parse KCB response
        // Success: { header: { statusCode: '0', statusDescription: 'Success' }, response: { ResponseCode: 0, ... } }
        const statusCode = result?.header?.statusCode;
        const rawDesc    = result?.header?.statusDescription
                        || result?.message
                        || result?.description
                        || 'Unknown KCB error';
        const isSuccess  = httpStatus === 200 && (statusCode === '0' || statusCode === 0);

        // Friendly error messages
        let friendlyMsg = rawDesc;
        if (rawDesc.toLowerCase().includes('busy'))           friendlyMsg = 'KCB system is busy. Please wait 30 seconds and try again.';
        if (rawDesc.toLowerCase().includes('duplicate'))      friendlyMsg = 'Duplicate request. Please wait 60 seconds before retrying.';
        if (rawDesc.toLowerCase().includes('invalid amount')) friendlyMsg = 'Invalid amount. Minimum is KES 1.';

        console.log('[KCB] statusCode:', statusCode, '| http:', httpStatus, '| desc:', rawDesc);

        if (isSuccess) {
            lastPushTime.set(normalizedPhone, Date.now());
            return NextResponse.json({
                success:           true,
                checkoutRequestId: invoiceNumber,
                message:           'STK Push sent! Check your phone for the M-Pesa prompt.',
            });
        }

        return NextResponse.json({ error: friendlyMsg, code: statusCode, raw: result }, { status: 400 });

    } catch (err: any) {
        console.error('[KCB STK] Error:', err.message);
        return NextResponse.json({ error: err.message || 'KCB STK Push failed' }, { status: 500 });
    }
}

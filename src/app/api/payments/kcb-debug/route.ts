// KCB URL Discovery — tries multiple gateway URLs from Vercel server
// GET /api/payments/kcb-debug
import { NextResponse } from 'next/server';

const API_KEY = process.env.KCB_API_KEY || '';

const BODY = JSON.stringify({
    MerchantTransID:     `TEST-${Date.now()}`,
    MerchantAccount:     process.env.KCB_ACCOUNT_NUMBER || '8113915',
    MerchantCallbackURL: 'https://apsims.vercel.app/api/payments/kcb-callback',
    CustomerMSISDN:      '254712345678',
    Language:            'EN',
    Currency:            'KES',
    Amount:              '1',
    MerchantName:        process.env.KCB_MERCHANT_NAME || 'Alpha School',
    ReferenceNo:         'TEST001',
    Operator:            '63902',
    SendingCountryCode:  'KE',
    TransactionName:     'Test Payment',
});

async function tryURL(url: string) {
    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
            body: BODY,
            signal: AbortSignal.timeout(8000),
        });
        const text = await r.text();
        return { url, status: r.status, body: text.substring(0, 200) };
    } catch (e: any) {
        return { url, status: 0, body: e.message };
    }
}

export async function GET() {
    const envCheck = {
        KCB_ENV:            process.env.KCB_ENV || 'NOT SET',
        KCB_PAYBILL:        process.env.KCB_PAYBILL || 'NOT SET',
        KCB_ACCOUNT_NUMBER: process.env.KCB_ACCOUNT_NUMBER || 'NOT SET',
        KCB_API_KEY_SET:    API_KEY.length > 10 ? `YES (${API_KEY.length} chars)` : 'NOT SET',
    };

    // Test all possible KCB gateway URLs
    const results = await Promise.all([
        tryURL('https://uat.buni.kcbgroup.com/mm/api/request/1.0.0'),
        tryURL('https://sandbox.buni.kcbgroup.com/mm/api/request/1.0.0'),
        tryURL('https://api.buni.kcbgroup.com/mm/api/request/1.0.0'),
        tryURL('https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/'),
        tryURL('https://sandbox.buni.kcbgroup.com:8243/mm/api/request/1.0.0'),
    ]);

    return NextResponse.json({ envCheck, urlTests: results });
}

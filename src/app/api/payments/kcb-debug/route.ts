// Test auth methods on the correct /stkpush path
import { NextResponse } from 'next/server';

const API_KEY = process.env.KCB_API_KEY || '';
const URL = 'https://uat.buni.kcbgroup.com/mm/api/request/1.0.0/stkpush';

const BODY = JSON.stringify({
    MerchantTransID:     `TEST-${Date.now()}`,
    MerchantAccount:     process.env.KCB_ACCOUNT_NUMBER || '8113915',
    MerchantCallbackURL: 'https://apsims.vercel.app/api/payments/kcb-callback',
    CustomerMSISDN:      '254712345678',
    Language:            'EN', Currency: 'KES', Amount: '1',
    MerchantName:        'Alpha School',
    ReferenceNo:         'TEST001', Operator: '63902',
    SendingCountryCode:  'KE', TransactionName: 'Test',
});

async function tryAuth(label: string, headers: Record<string, string>) {
    try {
        const r = await fetch(URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: BODY,
            signal: AbortSignal.timeout(8000),
        });
        const text = await r.text();
        return { label, status: r.status, body: text.substring(0, 200) };
    } catch (e: any) {
        return { label, status: 0, body: e.message };
    }
}

export async function GET() {
    const results = await Promise.all([
        tryAuth('apikey header',               { 'apikey': API_KEY }),
        tryAuth('Authorization Bearer',        { 'Authorization': `Bearer ${API_KEY}` }),
        tryAuth('x-api-key header',            { 'x-api-key': API_KEY }),
        tryAuth('apikey + Bearer',             { 'apikey': API_KEY, 'Authorization': `Bearer ${API_KEY}` }),
        tryAuth('Authorization ApiKey',        { 'Authorization': `ApiKey ${API_KEY}` }),
    ]);

    return NextResponse.json({
        endpoint: URL,
        apiKeyLength: API_KEY.length,
        results
    });
}

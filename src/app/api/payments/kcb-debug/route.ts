// KCB Resource Path Discovery
// GET /api/payments/kcb-debug
import { NextResponse } from 'next/server';

const API_KEY = process.env.KCB_API_KEY || '';
const BASE = 'https://uat.buni.kcbgroup.com';

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

async function tryPath(path: string, method = 'POST') {
    const url = `${BASE}${path}`;
    try {
        const r = await fetch(url, {
            method,
            headers: { 'apikey': API_KEY, 'Content-Type': 'application/json' },
            body: method === 'POST' ? BODY : undefined,
            signal: AbortSignal.timeout(6000),
        });
        const text = await r.text();
        // Only return non-404 "no matching resource" responses
        const isPortalHTML = text.includes('<!DOCTYPE html') || text.includes('<html');
        const body = isPortalHTML ? '[HTML portal page]' : text.substring(0, 150);
        return { path, method, status: r.status, body, interesting: r.status !== 404 || !text.includes('No matching resource') };
    } catch (e: any) {
        return { path, method, status: 0, body: e.message, interesting: false };
    }
}

export async function GET() {
    const paths = [
        '/mm/api/request/1.0.0',
        '/mm/api/request/1.0.0/',
        '/mm/api/request/1.0.0/payment',
        '/mm/api/request/1.0.0/initiate',
        '/mm/api/request/1.0.0/stkpush',
        '/mm/api/request/1.0.0/express',
        '/mm/api/request/1.0.0/processrequest',
        '/mm/api/request/1.0.0/request',
        '/mm/api/request/1.0.0/lipa',
        '/mm/api/request/1.0.0/push',
        '/mm/api/request/1.0.0/send',
        '/mm/api/request/1.0.0/c2b',
        '/mm/api/request',
        '/mm/api/request/1.0.0/stk',
        '/mm/api/request/1.0.0/pay',
    ];

    const results = await Promise.all(paths.map(p => tryPath(p)));
    const interesting = results.filter(r => r.interesting);
    const all = results.map(r => ({ p: r.path, s: r.status, b: r.body.substring(0, 100) }));

    return NextResponse.json({ interesting, all });
}

// DEBUG endpoint — check KCB env vars are configured on Vercel
// GET /api/payments/kcb-debug
import { NextResponse } from 'next/server';

export async function GET() {
    const apiKey = process.env.KCB_API_KEY || '';
    return NextResponse.json({
        KCB_ENV:            process.env.KCB_ENV || 'NOT SET',
        KCB_PAYBILL:        process.env.KCB_PAYBILL || 'NOT SET',
        KCB_ACCOUNT_NUMBER: process.env.KCB_ACCOUNT_NUMBER || 'NOT SET',
        KCB_MERCHANT_NAME:  process.env.KCB_MERCHANT_NAME || 'NOT SET',
        KCB_CALLBACK_URL:   process.env.KCB_CALLBACK_URL || 'NOT SET',
        KCB_API_KEY_SET:    apiKey.length > 10 ? `YES (${apiKey.length} chars, starts: ${apiKey.substring(0, 20)}...)` : 'NOT SET or too short',
        KCB_BASE_URL:       process.env.KCB_ENV !== 'live' ? 'https://uat.buni.kcbgroup.com' : 'https://api.buni.kcbgroup.com',
    });
}

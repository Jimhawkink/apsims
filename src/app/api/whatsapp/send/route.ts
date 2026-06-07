export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';

// ── Phone formatter for Meta WhatsApp API (no + prefix) ───────────────────────
function formatToE164(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '').replace(/[^\d+]/g, '');
    // Strip leading +
    if (cleaned.startsWith('+')) cleaned = cleaned.slice(1);
    // Convert 07xxxxxxxx → 254xxxxxxxxx
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
    // Ensure starts with 254
    if (!cleaned.startsWith('254')) cleaned = '254' + cleaned;
    return cleaned; // e.g. "254712345678"
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, message } = body;

        if (!phone || !message) {
            return NextResponse.json({ success: false, error: 'Phone and message are required' }, { status: 400 });
        }

        // ── Read WhatsApp config from env vars ────────────────────────────────
        const phoneNumberId = process.env.WHATSAPP_PHONE_ID;
        const accessToken = process.env.WHATSAPP_TOKEN;

        if (!phoneNumberId || !accessToken) {
            return NextResponse.json({ success: true, status: 'skipped', message: 'WhatsApp not configured' });
        }

        const formattedPhone = formatToE164(phone);

        // ── Meta Graph API v21.0 ──────────────────────────────────────────────
        const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: {
                preview_url: false,
                body: message,
            },
        };

        const metaRes = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const responseData = await metaRes.json();

        if (!metaRes.ok) {
            const errorMsg = responseData?.error?.message || JSON.stringify(responseData);
            return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
        }

        const messageId = responseData?.messages?.[0]?.id;
        return NextResponse.json({ success: true, messageId });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
    }
}

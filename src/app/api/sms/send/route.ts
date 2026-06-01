import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Phone formatter ───────────────────────────────────────────────────────────
function formatPhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '').replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('254')) return '+' + cleaned;
    if (cleaned.startsWith('0')) return '+254' + cleaned.slice(1);
    // Fallback: assume Kenyan number without prefix
    return '+254' + cleaned;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { phone, message, studentId, messageType } = body;

        if (!phone || !message) {
            return NextResponse.json({ success: false, error: 'Phone and message are required' }, { status: 400 });
        }

        // ── Read SMS config from school_details ───────────────────────────────
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: details } = await supabase
            .from('school_details')
            .select('sms_api_key, sms_username, sms_sender_id, sms_is_sandbox, sms_enabled')
            .limit(1)
            .single();

        // Graceful degradation — no config yet
        if (!details?.sms_api_key || !details?.sms_username) {
            return NextResponse.json({ success: true, status: 'skipped', message: 'SMS not configured' });
        }

        if (details.sms_enabled === false) {
            return NextResponse.json({ success: true, status: 'disabled', message: 'SMS is disabled' });
        }

        const { sms_api_key, sms_username, sms_sender_id, sms_is_sandbox } = details;
        const formattedPhone = formatPhone(phone);

        // ── AfricasTalking API call ────────────────────────────────────────────
        const endpoint = sms_is_sandbox
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : 'https://api.africastalking.com/version1/messaging';

        const params = new URLSearchParams({
            username: sms_username,
            to: formattedPhone,
            message: message,
        });
        if (sms_sender_id) params.append('from', sms_sender_id);

        const atRes = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': sms_api_key,
            },
            body: params.toString(),
        });

        const responseText = await atRes.text();
        let responseData: any;
        try {
            responseData = JSON.parse(responseText);
        } catch {
            if (!atRes.ok) {
                return NextResponse.json({ success: false, error: responseText }, { status: 500 });
            }
            responseData = { raw: responseText };
        }

        if (!atRes.ok) {
            return NextResponse.json({ success: false, error: responseData?.SMSMessageData?.Message || responseText }, { status: 500 });
        }

        // Check AfricasTalking response for actual delivery status
        const atStatus = responseData?.SMSMessageData?.Recipients?.[0]?.status;
        if (atStatus && atStatus !== 'Success') {
            return NextResponse.json({ success: false, error: atStatus, data: responseData }, { status: 500 });
        }

        return NextResponse.json({ success: true, status: 'sent', data: responseData });

    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
    }
}

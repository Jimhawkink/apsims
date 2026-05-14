import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Fallback env vars (original pattern)
const ENV_USERNAME = process.env.AT_USERNAME || 'sandbox';
const ENV_API_KEY = process.env.AT_API_KEY || '';
const ENV_SENDER_ID = process.env.AT_SENDER_ID || 'APSIMS';

function formatPhone(phone: string): string {
    let cleaned = phone.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '+254' + cleaned.slice(1);
    } else if (cleaned.startsWith('254')) {
        cleaned = '+' + cleaned;
    } else if (!cleaned.startsWith('+')) {
        cleaned = '+254' + cleaned;
    }
    return cleaned;
}

// Get SMS config from DB (school_details) or fallback to env vars
async function getSmsConfig() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) return { username: ENV_USERNAME, apiKey: ENV_API_KEY, senderId: ENV_SENDER_ID, isSandbox: ENV_USERNAME === 'sandbox' };

        const sb = createClient(supabaseUrl, supabaseKey);
        const { data } = await sb.from('school_details').select('sms_enabled, sms_api_key, sms_username, sms_sender_id, sms_is_sandbox').limit(1).single();

        if (data?.sms_api_key) {
            return {
                enabled: data.sms_enabled !== false,
                username: data.sms_username || 'sandbox',
                apiKey: data.sms_api_key,
                senderId: data.sms_sender_id || 'APSIMS',
                isSandbox: data.sms_is_sandbox !== false,
            };
        }
    } catch (e) {
        console.log('[SMS] Could not read DB config, using env vars');
    }
    return { enabled: true, username: ENV_USERNAME, apiKey: ENV_API_KEY, senderId: ENV_SENDER_ID, isSandbox: ENV_USERNAME === 'sandbox' };
}

export async function POST(request: NextRequest) {
    try {
        // ─── Auth + CSRF Check ───
        const { getSession, validateCsrf } = await import('@/lib/auth');
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const csrfToken = request.headers.get('x-csrf-token');
        const csrfValid = await validateCsrf(csrfToken);
        if (!csrfValid) return NextResponse.json({ error: 'CSRF validation failed' }, { status: 403 });

        const { phone, message } = await request.json();

        if (!phone || !message) {
            return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
        }

        // Get config from DB or env
        const config = await getSmsConfig();

        if (!config.apiKey || config.apiKey === 'your_africastalking_api_key_here') {
            console.log('[SMS] API key not configured. Message would be sent to:', phone);
            console.log('[SMS] Message:', message);
            return NextResponse.json({ success: true, status: 'skipped', note: 'SMS API key not configured - SMS not sent' });
        }

        if (!config.enabled) {
            return NextResponse.json({ success: true, status: 'disabled', note: 'SMS is disabled in settings' });
        }

        const formattedPhone = formatPhone(phone);

        // Africa's Talking API endpoint
        const url = config.isSandbox
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : 'https://api.africastalking.com/version1/messaging';

        const params = new URLSearchParams();
        params.append('username', config.username);
        params.append('to', formattedPhone);
        params.append('message', message);
        if (!config.isSandbox && config.senderId) {
            params.append('from', config.senderId);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': config.apiKey,
            },
            body: params.toString(),
        });

        // specific check for Africa's Talking common error format (plain text)
        const contentType = response.headers.get('content-type');
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error('[SMS] AT Non-JSON response:', text);
            return NextResponse.json({ success: false, error: text || 'SMS provider returned non-JSON error' }, { status: response.status });
        }

        console.log('[SMS] Africa\'s Talking response:', JSON.stringify(data));

        if (data.SMSMessageData?.Recipients?.[0]?.status === 'Success' ||
            data.SMSMessageData?.Recipients?.[0]?.statusCode === 101) {
            return NextResponse.json({ success: true, status: 'sent', data });
        }

        return NextResponse.json({
            success: true,
            status: 'submitted',
            data,
            note: 'SMS submitted to Africa\'s Talking'
        });

    } catch (error: any) {
        console.error('[SMS] Error:', error);
        return NextResponse.json({ error: error.message || 'SMS sending failed' }, { status: 500 });
    }
}

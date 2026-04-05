import { NextRequest, NextResponse } from 'next/server';

// Africa's Talking SMS API
const AT_USERNAME = process.env.AT_USERNAME || 'sandbox';
const AT_API_KEY = process.env.AT_API_KEY || '';
const AT_SENDER_ID = process.env.AT_SENDER_ID || 'APSIMS';

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

export async function POST(request: NextRequest) {
    try {
        const { phone, message } = await request.json();

        if (!phone || !message) {
            return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
        }

        if (!AT_API_KEY || AT_API_KEY === 'your_africastalking_api_key_here') {
            console.log('[SMS] API key not configured. Message would be sent to:', phone);
            console.log('[SMS] Message:', message);
            return NextResponse.json({ success: true, status: 'skipped', note: 'AT_API_KEY not configured - SMS not sent' });
        }

        const formattedPhone = formatPhone(phone);

        // Africa's Talking API endpoint
        const url = AT_USERNAME === 'sandbox'
            ? 'https://api.sandbox.africastalking.com/version1/messaging'
            : 'https://api.africastalking.com/version1/messaging';

        const params = new URLSearchParams();
        params.append('username', AT_USERNAME);
        params.append('to', formattedPhone);
        params.append('message', message);
        if (AT_USERNAME !== 'sandbox' && AT_SENDER_ID) {
            params.append('from', AT_SENDER_ID);
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/x-www-form-urlencoded',
                'apiKey': AT_API_KEY,
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

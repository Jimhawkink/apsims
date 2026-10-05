import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export interface PushPayload {
    to: string | string[];         // Expo push token(s)
    title: string;
    body: string;
    sound?: 'default' | string;
    data?: Record<string, any>;
    channelId?: string;            // Android channel
    badge?: number;
    priority?: 'default' | 'normal' | 'high';
    ttl?: number;
    categoryId?: string;
}

// POST /api/push/send
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            // Option A: pass tokens directly
            tokens,
            // Option B: pass role/form to look up tokens
            targetRole,   // 'parent' | 'teacher' | 'student' | 'admin' | 'all'
            targetFormId, // filter by form
            // Message
            title,
            message,
            sound = 'default',
            channelId = 'apsims-default',
            data = {},
            badge = 1,
            priority = 'high',
            // For logging
            sentBy,
            notificationType = 'general',
        } = body;

        if (!title || !message) {
            return NextResponse.json({ error: 'title and message required' }, { status: 400 });
        }

        // ── Resolve push tokens ───────────────────────────────────────────────
        let pushTokens: string[] = [];

        if (tokens && Array.isArray(tokens) && tokens.length > 0) {
            pushTokens = tokens.filter(t => t?.startsWith('ExponentPushToken'));
        } else {
            // Look up tokens from DB
            let q = supabaseAdmin.from('school_push_tokens').select('push_token, role');
            if (targetRole && targetRole !== 'all') q = q.eq('role', targetRole);
            const { data: tokenRows, error: tokenErr } = await q;
            if (tokenErr) return NextResponse.json({ error: tokenErr.message }, { status: 500 });
            pushTokens = (tokenRows || [])
                .map((r: any) => r.push_token)
                .filter(t => t?.startsWith('ExponentPushToken'));
        }

        if (pushTokens.length === 0) {
            return NextResponse.json({ sent: 0, message: 'No push tokens found' });
        }

        // ── Batch into chunks of 100 (Expo limit) ────────────────────────────
        const BATCH_SIZE = 100;
        const batches: string[][] = [];
        for (let i = 0; i < pushTokens.length; i += BATCH_SIZE) {
            batches.push(pushTokens.slice(i, i + BATCH_SIZE));
        }

        let totalSent = 0;
        let totalFailed = 0;
        const allResults: any[] = [];

        for (const batch of batches) {
            const messages = batch.map(token => ({
                to: token,
                title,
                body: message,
                sound,
                data: { ...data, notificationType },
                channelId,
                badge,
                priority,
                ttl: 3600,
            }));

            const res = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                },
                body: JSON.stringify(messages),
            });

            if (res.ok) {
                const result = await res.json();
                const receipts = result?.data || [];
                receipts.forEach((r: any) => {
                    if (r.status === 'ok') totalSent++;
                    else totalFailed++;
                });
                allResults.push(...receipts);
            } else {
                totalFailed += batch.length;
            }
        }

        // ── Log to DB ─────────────────────────────────────────────────────────
        try {
            await supabaseAdmin.from('school_push_log').insert([{
                title,
                message,
                notification_type: notificationType,
                target_role: targetRole || 'custom',
                tokens_sent: pushTokens.length,
                delivered: totalSent,
                failed: totalFailed,
                sent_by: sentBy || 'system',
                channel_id: channelId,
                sent_at: new Date().toISOString(),
            }]);
        } catch { /* log failure is non-critical */ }

        return NextResponse.json({
            success: true,
            sent: totalSent,
            failed: totalFailed,
            total: pushTokens.length,
        });

    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// GET /api/push/send — fetch push logs
export async function GET() {
    const { data, error } = await supabaseAdmin
        .from('school_push_log')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

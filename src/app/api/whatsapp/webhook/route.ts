import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabase } from '@/lib/supabase';

// GET — Meta webhook verification challenge
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST — Meta webhook event handler
export async function POST(req: NextRequest) {
  // Always respond 200 quickly (Meta requires < 20s)
  const rawBody = await req.text();

  // Verify signature
  const signature = req.headers.get('X-Hub-Signature-256') || req.headers.get('x-hub-signature-256');
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret && signature) {
    const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
    if (signature !== expected) {
      console.warn('[WhatsApp Webhook] Signature mismatch');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ status: 'ok' });
  }

  // Process webhook events asynchronously (don't await — respond immediately)
  processWebhookEvents(payload).catch(err => console.error('[WhatsApp Webhook] Processing error:', err));

  return NextResponse.json({ status: 'ok' });
}

async function processWebhookEvents(payload: Record<string, unknown>) {
  const entries = (payload.entry as unknown[]) || [];

  for (const entry of entries) {
    const changes = ((entry as Record<string, unknown>).changes as unknown[]) || [];
    for (const change of changes) {
      const value = (change as Record<string, unknown>).value as Record<string, unknown>;
      if (!value) continue;

      const statuses = (value.statuses as unknown[]) || [];
      for (const statusObj of statuses) {
        const s = statusObj as Record<string, unknown>;
        const messageId = s.id as string;
        const status = s.status as string;
        const timestamp = s.timestamp as string;

        if (!messageId || !status) continue;

        const ts = timestamp ? new Date(parseInt(timestamp) * 1000).toISOString() : new Date().toISOString();

        if (status === 'delivered') {
          await supabase
            .from('school_whatsapp_logs')
            .update({ status: 'delivered', delivered_at: ts })
            .eq('whatsapp_message_id', messageId);
        } else if (status === 'read') {
          await supabase
            .from('school_whatsapp_logs')
            .update({ status: 'read', read_at: ts })
            .eq('whatsapp_message_id', messageId);
        } else if (status === 'failed') {
          const errors = (s.errors as unknown[]) || [];
          const errorMsg = errors.length > 0
            ? ((errors[0] as Record<string, unknown>).message as string) || 'Delivery failed'
            : 'Delivery failed';
          await supabase
            .from('school_whatsapp_logs')
            .update({ status: 'failed', error_message: errorMsg })
            .eq('whatsapp_message_id', messageId);
        }
      }
    }
  }
}

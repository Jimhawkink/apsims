export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'apsims_webhook_verify_2026';

/**
 * GET /api/communication/whatsapp/webhook
 * WhatsApp Cloud API webhook verification (challenge-response)
 * Meta sends this when you register the webhook URL
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp Webhook] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn('[WhatsApp Webhook] Verification failed. Token mismatch.');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST /api/communication/whatsapp/webhook
 * Receives delivery status updates and incoming messages from WhatsApp
 * 
 * Status flow: sent → delivered → read → failed
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // Process each entry from the webhook payload
  const entries = body?.entry || [];
  
  for (const entry of entries) {
    const changes = entry?.changes || [];
    
    for (const change of changes) {
      const value = change?.value;
      if (!value) continue;

      // ─── Handle message status updates ───
      const statuses = value?.statuses || [];
      for (const status of statuses) {
        const { id: messageId, status: deliveryStatus, timestamp, recipient_id } = status;
        
        console.log(`[WhatsApp Webhook] Status update: ${deliveryStatus} for message ${messageId} to ${recipient_id}`);

        // Store delivery status in a tracking table (if exists)
        try {
          await supabase.from('school_whatsapp_delivery').upsert([{
            message_id: messageId,
            recipient_phone: recipient_id,
            status: deliveryStatus, // sent, delivered, read, failed
            status_timestamp: new Date(parseInt(timestamp) * 1000).toISOString(),
            error_code: status?.errors?.[0]?.code || null,
            error_title: status?.errors?.[0]?.title || null,
            updated_at: new Date().toISOString(),
          }], { onConflict: 'message_id' });
        } catch (err) {
          // Table may not exist yet — that's ok, just log
          console.warn('[WhatsApp Webhook] Could not store delivery status:', err);
        }
      }

      // ─── Handle incoming messages from parents ───
      const messages = value?.messages || [];
      for (const msg of messages) {
        const { from, timestamp, type, text } = msg;
        const contact = value?.contacts?.[0];
        const senderName = contact?.profile?.name || 'Unknown';

        console.log(`[WhatsApp Webhook] Incoming message from ${senderName} (${from}): ${text?.body?.substring(0, 100)}`);

        // Log incoming messages for future chatbot/response features
        try {
          await supabase.from('school_message_logs').insert([{
            message: `[INCOMING] From ${senderName} (${from}): ${text?.body || `[${type}]`}`.substring(0, 500),
            recipients: from,
            recipient_count: 1,
            status: 'Received',
            sent_by: senderName,
            sent_at: new Date(parseInt(timestamp) * 1000).toISOString(),
            message_type: 'whatsapp_incoming',
            created_at: new Date().toISOString(),
          }]);
        } catch (err) {
          console.warn('[WhatsApp Webhook] Could not log incoming message:', err);
        }
      }
    }
  }

  // WhatsApp requires 200 response within 5 seconds
  return NextResponse.json({ status: 'ok' }, { status: 200 });
}

export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type RecipientFilter = 'all_parents' | 'by_form' | 'by_stream' | 'fee_defaulters' | 'custom';
type MessageMode = 'text' | 'template';

// ─── WhatsApp Business Cloud API (Meta Graph API v21.0) ───
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const WA_TOKEN = process.env.WHATSAPP_TOKEN || '';
const WA_API_VERSION = 'v21.0';

// Template definitions matching KNEC/Kenya school context
const WHATSAPP_TEMPLATES: Record<string, { name: string; language: string; category: string }> = {
  fee_reminder: {
    name: 'fee_reminder',
    language: 'en',
    category: 'UTILITY',
  },
  exam_results: {
    name: 'exam_results_ready',
    language: 'en',
    category: 'UTILITY',
  },
  meeting_notice: {
    name: 'parents_meeting',
    language: 'en',
    category: 'UTILITY',
  },
  emergency_alert: {
    name: 'emergency_alert',
    language: 'en',
    category: 'UTILITY',
  },
  report_card: {
    name: 'report_card_ready',
    language: 'en',
    category: 'UTILITY',
  },
  holiday_notice: {
    name: 'holiday_notice',
    language: 'en',
    category: 'UTILITY',
  },
};

/**
 * Format Kenyan phone number to E.164 format (required by WhatsApp Cloud API)
 * 0712345678 → 254712345678
 * +254712345678 → 254712345678
 * 254712345678 → 254712345678
 */
function formatToE164(phone: string): string {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '').replace(/[^0-9+]/g, '');
  
  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  }
  
  // Convert 07xx to 2547xx
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  }
  
  // Ensure starts with 254
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned;
  }
  
  return cleaned;
}

/**
 * Send a WhatsApp text message via Meta Cloud API
 */
async function sendTextMessage(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!WA_PHONE_ID || !WA_TOKEN) {
    console.log('[WhatsApp] API not configured. Would send to:', phone, '| Message:', message.substring(0, 50) + '...');
    return { success: true, messageId: 'simulated_' + Date.now() };
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_ID}/messages`;
  const formattedPhone = formatToE164(phone);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WA_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { 
          preview_url: false,
          body: message 
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || JSON.stringify(data);
      console.error('[WhatsApp] API Error:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log('[WhatsApp] Sent successfully. ID:', messageId);
    return { success: true, messageId };

  } catch (err: any) {
    console.error('[WhatsApp] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a WhatsApp template message via Meta Cloud API
 * Template messages are pre-approved by Meta and required for business-initiated conversations
 */
async function sendTemplateMessage(
  phone: string, 
  templateKey: string, 
  parameters: string[]
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const template = WHATSAPP_TEMPLATES[templateKey];
  if (!template) {
    return { success: false, error: `Unknown template: ${templateKey}` };
  }

  if (!WA_PHONE_ID || !WA_TOKEN) {
    console.log('[WhatsApp Template] API not configured. Would send template:', templateKey, 'to:', phone, 'params:', parameters);
    return { success: true, messageId: 'simulated_template_' + Date.now() };
  }

  const url = `https://graph.facebook.com/${WA_API_VERSION}/${WA_PHONE_ID}/messages`;
  const formattedPhone = formatToE164(phone);

  // Build template components with parameters
  const components: any[] = [];
  if (parameters.length > 0) {
    components.push({
      type: 'body',
      parameters: parameters.map(text => ({ type: 'text', text })),
    });
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WA_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'template',
        template: {
          name: template.name,
          language: { code: template.language },
          components,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || JSON.stringify(data);
      console.error('[WhatsApp Template] API Error:', errorMsg);
      return { success: false, error: errorMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    console.log('[WhatsApp Template] Sent successfully. ID:', messageId);
    return { success: true, messageId };

  } catch (err: any) {
    console.error('[WhatsApp Template] Network error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── POST /api/communication/whatsapp ───
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal', 'Receptionist'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin, Principal or Receptionist role required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const {
    recipient_filter,
    message_content,
    message_mode = 'text',
    template_key,
    template_params = [],
    form_id,
    stream_id,
    custom_phones,
  }: {
    recipient_filter: RecipientFilter;
    message_content?: string;
    message_mode?: MessageMode;
    template_key?: string;
    template_params?: string[];
    form_id?: number;
    stream_id?: number;
    custom_phones?: string[];
  } = body;

  if (!recipient_filter) {
    return NextResponse.json({ error: 'recipient_filter is required' }, { status: 400 });
  }

  // Validate message content based on mode
  if (message_mode === 'template') {
    if (!template_key || !WHATSAPP_TEMPLATES[template_key]) {
      return NextResponse.json({ 
        error: 'Invalid or missing template_key. Available: ' + Object.keys(WHATSAPP_TEMPLATES).join(', ') 
      }, { status: 400 });
    }
  } else {
    if (!message_content?.trim()) {
      return NextResponse.json({ error: 'message_content is required for text mode' }, { status: 400 });
    }
  }

  const supabase = getServiceClient();

  // ─── Resolve recipient phone numbers ───
  let phones: string[] = [];
  let recipientDesc = '';

  if (recipient_filter === 'custom') {
    phones = (custom_phones || []).map(p => p.trim()).filter(Boolean);
    recipientDesc = 'Custom List';
    if (phones.length === 0) {
      return NextResponse.json({ error: 'custom_phones array is required for custom filter' }, { status: 400 });
    }
  } else {
    let query = supabase
      .from('school_students')
      .select('id, first_name, last_name, guardian_phone, guardian_name, form_id, stream_id')
      .eq('status', 'Active')
      .not('guardian_phone', 'is', null);

    if (recipient_filter === 'by_form' && form_id) {
      query = query.eq('form_id', form_id);
      recipientDesc = `Form ${form_id}`;
    } else if (recipient_filter === 'by_stream') {
      if (form_id) query = query.eq('form_id', form_id);
      if (stream_id) query = query.eq('stream_id', stream_id);
      recipientDesc = `Form ${form_id || 'All'} / Stream ${stream_id || 'All'}`;
    } else if (recipient_filter === 'fee_defaulters') {
      // Fee defaulters — will filter after fetch
      recipientDesc = 'Fee Defaulters';
    } else {
      recipientDesc = 'All Parents';
    }

    const { data: students, error: studentsError } = await query;
    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    phones = (students || [])
      .map((s: any) => s.guardian_phone)
      .filter(Boolean)
      .map((p: string) => p.trim());

    // Deduplicate phone numbers
    phones = [...new Set(phones)];
  }

  if (phones.length === 0) {
    return NextResponse.json({ error: 'No recipients found for the selected filter' }, { status: 400 });
  }

  // ─── Rate limiting: max 500 messages per batch ───
  const MAX_BATCH = 500;
  if (phones.length > MAX_BATCH) {
    phones = phones.slice(0, MAX_BATCH);
    console.warn(`[WhatsApp] Batch limited to ${MAX_BATCH} recipients`);
  }

  // ─── Dispatch messages with concurrency control ───
  let successCount = 0;
  const messageIds: string[] = [];
  const failures: { phone: string; error: string }[] = [];

  // Process in batches of 20 to respect rate limits
  const BATCH_SIZE = 20;
  const BATCH_DELAY_MS = 1000; // 1 second between batches

  for (let i = 0; i < phones.length; i += BATCH_SIZE) {
    const batch = phones.slice(i, i + BATCH_SIZE);
    
    const results = await Promise.allSettled(
      batch.map(async (phone) => {
        if (message_mode === 'template' && template_key) {
          return sendTemplateMessage(phone, template_key, template_params);
        } else {
          return sendTextMessage(phone, message_content!.trim());
        }
      })
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled' && result.value.success) {
        successCount++;
        if (result.value.messageId) messageIds.push(result.value.messageId);
      } else {
        const error = result.status === 'rejected' 
          ? result.reason?.message || 'Unknown error'
          : result.value.error || 'Unknown error';
        failures.push({ phone: batch[j], error });
      }
    }

    // Delay between batches to respect WhatsApp rate limits
    if (i + BATCH_SIZE < phones.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  // ─── Determine status ───
  const status = failures.length === 0 
    ? 'Sent' 
    : failures.length === phones.length 
      ? 'Failed' 
      : 'Partial';

  // ─── Log to school_message_logs ───
  const logPayload = {
    message: message_mode === 'template' 
      ? `[Template: ${template_key}] Params: ${template_params.join(', ')}`
      : message_content!.trim(),
    recipients: recipientDesc,
    recipient_count: phones.length,
    status,
    sent_by: session.full_name || session.id || 'System',
    sent_at: new Date().toISOString(),
    message_type: 'whatsapp',
    created_at: new Date().toISOString(),
  };

  const { error: logError } = await supabase.from('school_message_logs').insert([logPayload]);
  if (logError) {
    console.warn('[WhatsApp] Failed to log message:', logError.message);
  }

  // ─── Log delivery failures separately ───
  if (failures.length > 0) {
    console.warn(`[WhatsApp] ${failures.length} delivery failures`);
    // Log first 10 failures to avoid DB flood
    const failureLogPromises = failures.slice(0, 10).map(failure =>
      supabase.from('school_message_logs').insert([{
        message: `DELIVERY FAILURE to ${failure.phone}: ${failure.error}`.substring(0, 300),
        recipients: failure.phone,
        recipient_count: 1,
        status: 'Failed',
        sent_by: session.full_name || session.id || 'System',
        sent_at: new Date().toISOString(),
        message_type: 'whatsapp_error',
        created_at: new Date().toISOString(),
      }])
    );
    await Promise.allSettled(failureLogPromises);
  }

  return NextResponse.json({
    success: successCount > 0,
    sent: successCount,
    failed: failures.length,
    total: phones.length,
    status,
    message_mode,
    template_key: message_mode === 'template' ? template_key : undefined,
    failures: failures.length > 0 ? failures.slice(0, 20) : undefined,
  });
}

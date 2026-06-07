export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function generateBatchId() {
  return `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function sendWhatsAppMessage(phone: string, templateName: string, params: string[]) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('WhatsApp credentials not configured');
  }

  // Format phone to E.164 (Kenya: +254...)
  let formattedPhone = phone.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
  if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

  const body = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components: params.length > 0 ? [{
        type: 'body',
        parameters: params.map(p => ({ type: 'text', text: p })),
      }] : [],
    },
  };

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Meta API error');
  return data.messages?.[0]?.id as string;
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const role = session.user.user_metadata?.role;
  if (!['admin', 'principal'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const body = await req.json();
  const { term_id, recipient_filter, template_key, form_id, stream_id, custom_phones } = body;

  if (!term_id || !recipient_filter || !template_key) {
    return NextResponse.json({ error: 'term_id, recipient_filter, and template_key are required' }, { status: 400 });
  }

  // Fetch students based on filter
  let studentsQuery = supabase
    .from('school_students')
    .select('id, first_name, last_name, admission_number, guardian_phone, guardian_name, form_id, stream_id')
    .eq('status', 'Active')
    .not('guardian_phone', 'is', null);

  if (recipient_filter === 'by_form' && form_id) studentsQuery = studentsQuery.eq('form_id', form_id);
  if (recipient_filter === 'by_stream' && stream_id) studentsQuery = studentsQuery.eq('stream_id', stream_id);

  const { data: students, error: studError } = await studentsQuery;
  if (studError) return NextResponse.json({ error: studError.message }, { status: 500 });

  // Build recipient list
  let recipients: { phone: string; student_id: number | null; name: string; student?: typeof students[0] }[] = [];

  if (recipient_filter === 'custom' && custom_phones) {
    const phones = (custom_phones as string[]).filter(p => p.trim());
    recipients = phones.map(p => ({ phone: p, student_id: null, name: p }));
  } else {
    recipients = (students || []).map(s => ({
      phone: s.guardian_phone!,
      student_id: s.id,
      name: s.guardian_name || `${s.first_name} ${s.last_name}`,
      student: s,
    }));
  }

  const batchId = generateBatchId();
  const sentBy = session.user.email || 'system';
  let sent = 0, failed = 0;
  const BATCH_SIZE = 20;

  // Process in batches of 20
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (r) => {
      let messageId: string | null = null;
      let status = 'sent';
      let errorMsg: string | null = null;

      try {
        const params = r.student
          ? [`${r.student.first_name} ${r.student.last_name}`, r.student.admission_number]
          : [r.name];
        messageId = await sendWhatsAppMessage(r.phone, template_key, params);
        sent++;
      } catch (e: unknown) {
        status = 'failed';
        errorMsg = e instanceof Error ? e.message : 'Unknown error';
        failed++;
      }

      // Log the attempt
      await supabase.from('school_whatsapp_logs').insert([{
        recipient_phone: r.phone,
        recipient_name: r.name,
        student_id: r.student_id,
        message_type: 'report_card',
        template_name: template_key,
        whatsapp_message_id: messageId,
        status,
        error_message: errorMsg,
        cost_saved: 1.0,
        term_id,
        sent_by: sentBy,
        sent_at: new Date().toISOString(),
      }]);

      // Update report card delivery record if student
      if (r.student_id && messageId) {
        await supabase.from('school_report_card_deliveries')
          .update({
            whatsapp_message_id: messageId,
            whatsapp_status: status,
            whatsapp_sent_at: new Date().toISOString(),
          })
          .eq('student_id', r.student_id)
          .eq('term_id', term_id);
      }
    }));

    // 1-second delay between batches
    if (i + BATCH_SIZE < recipients.length) await sleep(1000);
  }

  return NextResponse.json({ sent, failed, total: recipients.length, batch_id: batchId });
}

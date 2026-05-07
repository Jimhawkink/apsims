import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── POST /api/fees/defaulter-automation/run ───
// Identify fee defaulters and dispatch messages per escalation rules
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Bursar'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  const supabase = getServiceClient();
  const tenantId = '00000000-0000-0000-0000-000000000000';
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // ─── Get current term ───
  const { data: currentTerm, error: termError } = await supabase
    .from('school_terms')
    .select('*')
    .eq('is_current', true)
    .maybeSingle();

  if (termError) {
    return NextResponse.json({ error: termError.message }, { status: 500 });
  }

  if (!currentTerm) {
    return NextResponse.json({ error: 'No current term found' }, { status: 400 });
  }

  // ─── Get active escalation rules ───
  const { data: rules, error: rulesError } = await supabase
    .from('school_fee_defaulter_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('step_number', { ascending: true });

  if (rulesError) {
    return NextResponse.json({ error: rulesError.message }, { status: 500 });
  }

  if (!rules || rules.length === 0) {
    return NextResponse.json({ message: 'No active escalation rules found', dispatched: 0 });
  }

  // ─── Get students with fee balance > 0 ───
  const { data: defaulters, error: defaultersError } = await supabase
    .from('school_students')
    .select('id, first_name, last_name, guardian_name, guardian_phone, fee_balance, form_id')
    .eq('status', 'Active')
    .gt('fee_balance', 0)
    .not('guardian_phone', 'is', null);

  if (defaultersError) {
    return NextResponse.json({ error: defaultersError.message }, { status: 500 });
  }

  if (!defaulters || defaulters.length === 0) {
    return NextResponse.json({ message: 'No fee defaulters found', dispatched: 0 });
  }

  // ─── Determine term due date ───
  // Use end_date of current term as the due date
  const termDueDate = currentTerm.end_date ? new Date(currentTerm.end_date) : null;

  let totalDispatched = 0;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

  // ─── For each active rule, check if today matches the days_offset ───
  for (const rule of rules) {
    if (!termDueDate) continue;

    // Calculate the target date for this rule
    const targetDate = new Date(termDueDate);
    targetDate.setDate(targetDate.getDate() + rule.days_offset);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Only dispatch if today matches the target date
    if (todayStr !== targetDateStr) continue;

    // ─── Dispatch to each defaulter ───
    for (const student of defaulters) {
      const message = rule.message_template
        .replace(/{guardian}/g, student.guardian_name || 'Parent/Guardian')
        .replace(/{student_name}/g, `${student.first_name} ${student.last_name}`)
        .replace(/{balance}/g, `${(student.fee_balance || 0).toLocaleString('en-KE')}`);

      const phone = student.guardian_phone;

      // ─── Send SMS ───
      if (rule.channel === 'SMS' || rule.channel === 'Both') {
        try {
          await fetch(`${baseUrl}/api/send-sms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message }),
          });
        } catch (err) {
          console.error('[DefaulterAutomation] SMS send error:', err);
        }
      }

      // ─── Send WhatsApp ───
      if (rule.channel === 'WhatsApp' || rule.channel === 'Both') {
        try {
          await fetch(`${baseUrl}/api/communication/whatsapp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient_filter: 'custom',
              message_content: message,
              custom_phones: [phone],
            }),
          });
        } catch (err) {
          console.error('[DefaulterAutomation] WhatsApp send error:', err);
        }
      }

      // ─── Log dispatch ───
      await supabase.from('school_message_logs').insert([{
        message,
        recipients: `${student.first_name} ${student.last_name} (Step ${rule.step_number})`,
        recipient_count: 1,
        status: 'Sent',
        sent_by: session.id,
        sent_at: new Date().toISOString(),
        message_type: rule.channel === 'Both' ? 'sms+whatsapp' : rule.channel.toLowerCase(),
        created_at: new Date().toISOString(),
      }]);

      totalDispatched++;
    }
  }

  return NextResponse.json({
    success: true,
    dispatched: totalDispatched,
    defaulters: defaulters.length,
    message: `Dispatched ${totalDispatched} messages to ${defaulters.length} fee defaulters`,
  });
}


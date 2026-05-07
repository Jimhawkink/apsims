import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/fees/defaulter-automation ───
// Return all escalation rules for tenant ordered by step_number
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Bursar'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  const supabase = getServiceClient();

  // For now, use a placeholder tenant_id (in production, this would come from session)
  const tenantId = '00000000-0000-0000-0000-000000000000';

  const { data, error } = await supabase
    .from('school_fee_defaulter_rules')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('step_number', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/fees/defaulter-automation ───
// Upsert up to 5 escalation steps
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Bursar'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { steps }: { steps: Array<{
    step_number: number;
    days_offset: number;
    message_template: string;
    channel: 'SMS' | 'WhatsApp' | 'Both';
    is_active: boolean;
  }> } = body;

  if (!Array.isArray(steps) || steps.length === 0 || steps.length > 5) {
    return NextResponse.json({ error: 'steps must be an array of 1-5 items' }, { status: 400 });
  }

  // Validate each step
  for (const step of steps) {
    if (!step.step_number || step.step_number < 1 || step.step_number > 5) {
      return NextResponse.json({ error: 'step_number must be between 1 and 5' }, { status: 400 });
    }
    if (step.days_offset === undefined || step.days_offset === null) {
      return NextResponse.json({ error: 'days_offset is required' }, { status: 400 });
    }
    if (!step.message_template?.trim()) {
      return NextResponse.json({ error: 'message_template is required' }, { status: 400 });
    }
    if (!['SMS', 'WhatsApp', 'Both'].includes(step.channel)) {
      return NextResponse.json({ error: 'channel must be SMS, WhatsApp, or Both' }, { status: 400 });
    }
  }

  const supabase = getServiceClient();
  const tenantId = '00000000-0000-0000-0000-000000000000';

  // Upsert each step
  const upsertPromises = steps.map(step =>
    supabase
      .from('school_fee_defaulter_rules')
      .upsert({
        tenant_id: tenantId,
        step_number: step.step_number,
        days_offset: step.days_offset,
        message_template: step.message_template.trim(),
        channel: step.channel,
        is_active: step.is_active !== false,
      }, {
        onConflict: 'tenant_id,step_number',
      })
  );

  const results = await Promise.all(upsertPromises);
  const errors = results.filter(r => r.error);

  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0].error!.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Escalation steps saved successfully' });
}


export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── PATCH /api/admissions/applications/[id]/status ────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const appId = Number(params.id);
  if (isNaN(appId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { status, review_notes, updated_by } = body;
  const validStatuses = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Waitlisted'];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const supabase = svc();

  const { data: app, error: fetchErr } = await supabase
    .from('school_admission_applications')
    .select('reference_number, student_first_name, student_last_name, status')
    .eq('id', appId)
    .maybeSingle();

  if (fetchErr || !app) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  // Update status
  const { error } = await supabase.from('school_admission_applications')
    .update({ status, review_notes, updated_at: new Date().toISOString() })
    .eq('id', appId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Create status-change notification for applicant
  const statusMessages: Record<string, string> = {
    'Under Review': `Your application (Ref: ${app.reference_number}) for ${app.student_first_name} ${app.student_last_name} is now under review by our admissions team. This typically takes 3–5 working days. You will be notified of the outcome.`,
    'Approved': `🎉 Congratulations! The application for ${app.student_first_name} ${app.student_last_name} (Ref: ${app.reference_number}) has been APPROVED. Please contact the school admissions office to confirm the place and receive reporting instructions.`,
    'Rejected': `We regret to inform you that the application for ${app.student_first_name} ${app.student_last_name} (Ref: ${app.reference_number}) was not successful at this time.${review_notes ? ` Reason: ${review_notes}` : ''} Please contact our admissions office for more information.`,
    'Waitlisted': `The application for ${app.student_first_name} ${app.student_last_name} (Ref: ${app.reference_number}) has been placed on our waitlist. We will contact you immediately if a place becomes available. Please keep your phone reachable.`,
  };

  const statusTitles: Record<string, string> = {
    'Under Review': '🔍 Application Now Under Review',
    'Approved': '🎉 Application Approved!',
    'Rejected': '😔 Application Decision — Unsuccessful',
    'Waitlisted': '⏳ Application Waitlisted',
  };

  if (statusMessages[status]) {
    await supabase.from('school_admission_notifications').insert({
      application_id: appId,
      reference_number: app.reference_number,
      sender_type: 'school',
      message_type: 'status_update',
      title: statusTitles[status],
      message: statusMessages[status] + (review_notes && status !== 'Rejected' ? `\n\nNote from admissions: ${review_notes}` : ''),
      is_read_by_admin: true,
    });
  }

  return NextResponse.json({ success: true });
}

// ── POST for backward compat ──────────────────────────────────────────────────
export async function POST(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx);
}

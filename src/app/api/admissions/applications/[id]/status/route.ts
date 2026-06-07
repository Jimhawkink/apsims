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

// ─── PATCH /api/admissions/applications/[id]/status ───
// Restricted to Admin/Principal
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { status, review_notes } = body;

  const validStatuses = ['Submitted', 'Under Review', 'Approved', 'Rejected', 'Waitlisted'];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Fetch application for SMS
  const { data: application, error: fetchError } = await supabase
    .from('school_admission_applications')
    .select('id, guardian_full_name, guardian_phone, student_first_name, student_last_name, reference_number')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!application) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  // Update status
  const { data, error } = await supabase
    .from('school_admission_applications')
    .update({
      status,
      review_notes: review_notes || null,
      reviewed_by: session.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // ─── Send status-specific SMS (best-effort) ───
  try {
    const studentName = `${application.student_first_name} ${application.student_last_name}`;
    const guardian = application.guardian_full_name;
    const ref = application.reference_number;

    let smsMessage = '';
    if (status === 'Approved') {
      smsMessage = `Dear ${guardian}, ${studentName}'s application has been APPROVED. Please report to school on the agreed date. Ref: ${ref}. - APSIMS`;
    } else if (status === 'Rejected') {
      smsMessage = `Dear ${guardian}, ${studentName}'s application has been REJECTED. Ref: ${ref}. Contact school for details. - APSIMS`;
    } else if (status === 'Waitlisted') {
      smsMessage = `Dear ${guardian}, ${studentName}'s application is WAITLISTED. Ref: ${ref}. We will contact you. - APSIMS`;
    }

    if (smsMessage && application.guardian_phone) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: application.guardian_phone, message: smsMessage }),
      });
    }
  } catch {
    // SMS failure should not block the response
  }

  return NextResponse.json({ data });
}

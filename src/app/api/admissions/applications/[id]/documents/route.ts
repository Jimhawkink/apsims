export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function svc() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── GET /api/admissions/applications/[id]/documents?ref=ADM-xxx ───────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const appId = Number(params.id);
  if (isNaN(appId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  const ref = new URL(req.url).searchParams.get('ref');
  const supabase = svc();

  // If ref provided verify ownership
  if (ref) {
    const { data: app } = await supabase
      .from('school_admission_applications').select('id').eq('id', appId).eq('reference_number', ref).maybeSingle();
    if (!app) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Mark school messages as read by applicant
    await supabase.from('school_admission_notifications')
      .update({ is_read_by_applicant: true, applicant_read_at: new Date().toISOString() })
      .eq('application_id', appId).eq('sender_type', 'school').eq('is_read_by_applicant', false);
  }

  const [docsRes, notifsRes] = await Promise.all([
    supabase.from('school_admission_documents').select('*').eq('application_id', appId).order('uploaded_at', { ascending: false }),
    supabase.from('school_admission_notifications').select('*').eq('application_id', appId).order('created_at', { ascending: false }),
  ]);
  return NextResponse.json({ documents: docsRes.data || [], notifications: notifsRes.data || [] });
}

// ── POST /api/admissions/applications/[id]/documents ─────────────────────────
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const appId = Number(params.id);
  if (isNaN(appId)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid body' }, { status: 400 }); }
  const { app_ref, document_type, document_name, file_url, file_size, mime_type, action } = body;
  const supabase = svc();

  // ── ACKNOWLEDGE documents (admin action) ──────────────────────────────────
  if (action === 'acknowledge') {
    const { acknowledged_by } = body;
    const { data: app } = await supabase.from('school_admission_applications')
      .select('reference_number, student_first_name, student_last_name').eq('id', appId).maybeSingle();
    const studentName = app ? `${app.student_first_name} ${app.student_last_name}` : 'the student';
    const ref = app?.reference_number || app_ref || '';
    await supabase.from('school_admission_applications').update({
      docs_acknowledged: true, docs_acknowledged_at: new Date().toISOString(),
      docs_acknowledged_by: acknowledged_by || 'Admissions Office',
    }).eq('id', appId);
    await supabase.from('school_admission_notifications').insert({
      application_id: appId, app_ref: ref, sender_type: 'school', message_type: 'doc_acknowledged',
      title: '✅ Documents Received — Verification in Progress',
      message: `Dear Parent/Guardian,\n\nWe have successfully received the uploaded documents for ${studentName} (Ref: ${ref}).\n\nOur admissions team is currently verifying the documents. We will notify you once verification is complete and a final decision has been made.\n\nThank you for your patience and cooperation.\n\n— Admissions Office`,
      is_read_by_admin: true,
    });
    await supabase.from('school_admission_notifications')
      .update({ is_read_by_admin: true, admin_read_at: new Date().toISOString() })
      .eq('application_id', appId).eq('sender_type', 'applicant');
    return NextResponse.json({ success: true });
  }

  // ── REQUEST MORE DOCUMENTS (admin action) ─────────────────────────────────
  if (action === 'request_docs') {
    const { missing_docs, admin_name } = body;
    const { data: app } = await supabase.from('school_admission_applications')
      .select('reference_number, student_first_name, student_last_name').eq('id', appId).maybeSingle();
    const ref = app?.reference_number || app_ref || '';
    await supabase.from('school_admission_notifications').insert({
      application_id: appId, app_ref: ref, sender_type: 'school', message_type: 'request_docs',
      title: '📋 Additional Documents Required',
      message: `Dear Parent/Guardian,\n\nRegarding the application for ${app?.student_first_name} ${app?.student_last_name} (Ref: ${ref}), our team requires the following additional documents:\n\n${missing_docs}\n\nPlease upload these through the admissions status portal or bring originals to the school admissions office.\n\nContact us if you need any assistance.\n\n— ${admin_name || 'Admissions Office'}`,
    });
    return NextResponse.json({ success: true });
  }

  // ── SAVE UPLOADED DOCUMENT METADATA (applicant) ───────────────────────────
  if (!app_ref || !document_type || !document_name)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  const { data: app } = await supabase.from('school_admission_applications')
    .select('id, reference_number, student_first_name, student_last_name, document_count')
    .eq('id', appId).eq('reference_number', app_ref).maybeSingle();
  if (!app) return NextResponse.json({ error: 'Application not found or ref mismatch' }, { status: 404 });

  const { data: doc } = await supabase.from('school_admission_documents').insert({
    application_id: appId, app_ref, document_type, document_name,
    file_url: file_url || null, file_size: file_size || null, mime_type: mime_type || null,
  }).select().maybeSingle();

  const newCount = (app.document_count || 0) + 1;
  await supabase.from('school_admission_applications').update({
    last_document_upload_at: new Date().toISOString(), document_count: newCount, docs_acknowledged: false,
  }).eq('id', appId);

  // Create/update admin notification
  const { data: existing } = await supabase.from('school_admission_notifications').select('id')
    .eq('application_id', appId).eq('message_type', 'document_upload').eq('is_read_by_admin', false).maybeSingle();
  const notifData = {
    title: `📁 Documents Uploaded (${newCount}) — ${app.student_first_name} ${app.student_last_name}`,
    message: `The applicant for ${app.student_first_name} ${app.student_last_name} (Ref: ${app_ref}) has uploaded ${newCount} supporting document(s). Please review and acknowledge receipt.`,
  };
  if (existing) {
    await supabase.from('school_admission_notifications').update(notifData).eq('id', existing.id);
  } else {
    await supabase.from('school_admission_notifications').insert({
      application_id: appId, app_ref, sender_type: 'applicant', message_type: 'document_upload', ...notifData,
    });
  }
  return NextResponse.json({ success: true, document: doc });
}

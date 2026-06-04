import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/admissions/applications/[id]/documents ─────────────────────────
// Admin/Principal only — view submitted documents for an application
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['admin', 'principal', 'teacher'];
  if (!allowedRoles.includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Insufficient role' }, { status: 403 });
  }

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_admission_documents')
    .select('*')
    .eq('application_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/admissions/applications/[id]/documents ────────────────────────
// Public — applicant records an uploaded document URL after submission
// Requires: { reference_number, document_type, file_url, file_name }
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { reference_number, document_type, file_url, file_name } = body;

  if (!reference_number?.trim()) return NextResponse.json({ error: 'Reference number required' }, { status: 400 });
  if (!document_type?.trim())    return NextResponse.json({ error: 'Document type required' }, { status: 400 });
  if (!file_url?.trim())         return NextResponse.json({ error: 'File URL required' }, { status: 400 });

  const id = Number(params.id);
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid application ID' }, { status: 400 });

  const supabase = getServiceClient();

  // Verify the reference_number matches the application id (prevent spoofing)
  const { data: app } = await supabase
    .from('school_admission_applications')
    .select('id, reference_number')
    .eq('id', id)
    .eq('reference_number', reference_number.trim().toUpperCase())
    .maybeSingle();

  if (!app) {
    return NextResponse.json({ error: 'Application not found or reference number mismatch' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('school_admission_documents')
    .insert([{
      application_id:  id,
      document_type:   document_type.trim(),
      file_url:        file_url.trim(),
      file_name:       file_name?.trim() || document_type.trim(),
      uploaded_at:     new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

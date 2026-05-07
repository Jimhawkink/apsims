import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

const WRITE_ROLES = ['Admin', 'Teacher'];

// ─── GET /api/lms/resources ───────────────────────────────────────────────────
// Query params: subject_id, form_id
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!WRITE_ROLES.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Teacher or Admin role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const subject_id = searchParams.get('subject_id');
  const form_id = searchParams.get('form_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_lms_resources')
    .select(`
      *,
      school_subjects(id, subject_name),
      school_forms(id, form_name)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (subject_id) query = query.eq('subject_id', Number(subject_id));
  if (form_id) query = query.eq('form_id', Number(form_id));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/lms/resources ──────────────────────────────────────────────────
// Body: subject_id, form_id, topic_name, resource_title, resource_type, file_url?, video_url?
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!WRITE_ROLES.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Teacher or Admin role required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { subject_id, form_id, topic_name, resource_title, resource_type, file_url, video_url } = body;

  if (!topic_name?.trim()) return NextResponse.json({ error: 'topic_name is required' }, { status: 400 });
  if (!resource_title?.trim()) return NextResponse.json({ error: 'resource_title is required' }, { status: 400 });
  if (!resource_type) return NextResponse.json({ error: 'resource_type is required' }, { status: 400 });

  const validTypes = ['PDF', 'Word', 'Video Link', 'Other'];
  if (!validTypes.includes(resource_type)) {
    return NextResponse.json({ error: `resource_type must be one of: ${validTypes.join(', ')}` }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_lms_resources')
    .insert([{
      tenant_id: session.tenant_id,
      subject_id: subject_id || null,
      form_id: form_id || null,
      topic_name: topic_name.trim(),
      resource_title: resource_title.trim(),
      resource_type,
      file_url: file_url?.trim() || null,
      video_url: video_url?.trim() || null,
      uploaded_by: session.id,
      upload_date: new Date().toISOString().split('T')[0],
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}


import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── POST /api/lms/resources/[id]/access ─────────────────────────────────────
// Log a resource access event and return the file_url
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = Number(params.id);
  if (!id || isNaN(id)) return NextResponse.json({ error: 'Invalid resource ID' }, { status: 400 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }

  const { student_id } = body;

  const supabase = getServiceClient();

  // Fetch the resource to get file_url
  const { data: resource, error: fetchError } = await supabase
    .from('school_lms_resources')
    .select('id, file_url, video_url, resource_type, is_active')
    .eq('id', id)
    .single();

  if (fetchError || !resource) {
    return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
  }

  if (!resource.is_active) {
    return NextResponse.json({ error: 'Resource is no longer available' }, { status: 410 });
  }

  // Insert access log
  const { error: logError } = await supabase
    .from('school_lms_resource_access_logs')
    .insert([{
      resource_id: id,
      student_id: student_id || null,
      accessed_at: new Date().toISOString(),
    }]);

  if (logError) {
    // Log failure is non-fatal — still return the URL
    console.error('Failed to log resource access:', logError.message);
  }

  return NextResponse.json({
    file_url: resource.file_url,
    video_url: resource.video_url,
    resource_type: resource.resource_type,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// GET /api/transport/sms-logs?route_id= — list SMS notification logs
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const route_id = searchParams.get('route_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_transport_sms_logs')
    .select(`
      *,
      school_transport_routes (id, route_name),
      school_students (id, first_name, last_name)
    `)
    .order('sent_at', { ascending: false })
    .limit(200);

  if (route_id) query = query.eq('route_id', Number(route_id));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

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

// GET /api/transport/drivers — list drivers for tenant ordered by full_name
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_transport_drivers')
    .select('*')
    .order('full_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

// POST /api/transport/drivers — register a new driver; restrict to Admin/Bursar
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['Admin', 'Bursar'].map((r) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { full_name, phone, national_id, licence_number, licence_expiry_date } = body;

  if (!full_name?.trim()) {
    return NextResponse.json({ error: 'full_name is required' }, { status: 400 });
  }
  if (!phone?.trim()) {
    return NextResponse.json({ error: 'phone is required' }, { status: 400 });
  }
  if (!national_id?.trim()) {
    return NextResponse.json({ error: 'national_id is required' }, { status: 400 });
  }
  if (!licence_number?.trim()) {
    return NextResponse.json({ error: 'licence_number is required' }, { status: 400 });
  }
  if (!licence_expiry_date) {
    return NextResponse.json({ error: 'licence_expiry_date is required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_transport_drivers')
    .insert([{
      tenant_id: session.id,
      full_name: full_name.trim(),
      phone: phone.trim(),
      national_id: national_id.trim(),
      licence_number: licence_number.trim(),
      licence_expiry_date,
      is_active: true,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/visitors ───
// Query params: date (YYYY-MM-DD, defaults to today)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

  const supabase = getServiceClient();

  // Filter by check_in_time date
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('school_visitor_cards')
    .select('*')
    .gte('check_in_time', startOfDay)
    .lte('check_in_time', endOfDay)
    .order('check_in_time', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}

// ─── POST /api/visitors ───
// Check-in a new visitor; restrict to Admin/Receptionist
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const writeRoles = ['Admin', 'Receptionist'];
  if (!writeRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Receptionist role required' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { visitor_full_name, visitor_id_number, phone, purpose, host_person, card_number } = body;

  if (!visitor_full_name?.trim() || !visitor_id_number?.trim() || !purpose?.trim() || !card_number?.trim()) {
    return NextResponse.json(
      { error: 'visitor_full_name, visitor_id_number, purpose, and card_number are required' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();

  // Check for active card number collision
  const { data: existing } = await supabase
    .from('school_visitor_cards')
    .select('id')
    .eq('card_number', card_number.trim())
    .is('check_out_time', null)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: `Card number "${card_number}" is already assigned to an active visitor. Please use a different card.` },
      { status: 409 }
    );
  }

  const { data, error } = await supabase
    .from('school_visitor_cards')
    .insert([{
      visitor_full_name: visitor_full_name.trim(),
      visitor_id_number: visitor_id_number.trim(),
      phone: phone?.trim() || null,
      purpose: purpose.trim(),
      host_person: host_person?.trim() || null,
      card_number: card_number.trim(),
      check_in_time: new Date().toISOString(),
      check_out_time: null,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}


import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// POST /api/transport/fees/payments — record a transport fee payment; restrict to Admin/Bursar
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

  const { student_id, route_id, term_id, amount, payment_method, receipt_number, payment_date } = body;

  if (!student_id) return NextResponse.json({ error: 'student_id is required' }, { status: 400 });
  if (!route_id) return NextResponse.json({ error: 'route_id is required' }, { status: 400 });
  if (!term_id) return NextResponse.json({ error: 'term_id is required' }, { status: 400 });
  if (!amount || Number(amount) <= 0) {
    return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
  }
  if (!payment_method?.trim()) {
    return NextResponse.json({ error: 'payment_method is required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_transport_fee_payments')
    .insert([{
      tenant_id: session.id,
      student_id: Number(student_id),
      route_id: Number(route_id),
      term_id: Number(term_id),
      amount: Number(amount),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method: payment_method.trim(),
      receipt_number: receipt_number?.trim() || null,
      recorded_by: session.id,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

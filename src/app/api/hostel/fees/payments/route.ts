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

// POST /api/hostel/fees/payments — record hostel fee payment; restrict to Admin/Bursar
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const writeRoles = ['Admin', 'Bursar'];
  if (!writeRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Bursar role required' }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { student_id, term_id, amount, payment_date, payment_method, receipt_number } = body;
  if (!student_id || !term_id || !amount || !payment_method) {
    return NextResponse.json({ error: 'student_id, term_id, amount, and payment_method are required' }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('school_hostel_fee_payments')
    .insert([{
      tenant_id: session.id,
      student_id: Number(student_id),
      term_id: Number(term_id),
      amount: Number(amount),
      payment_date: payment_date || new Date().toISOString().split('T')[0],
      payment_method,
      receipt_number: receipt_number || null,
      recorded_by: session.id,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}


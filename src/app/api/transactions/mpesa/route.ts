export const dynamic = 'force-dynamic';
// /api/transactions/mpesa — Server-side read of school_mpesa_transactions
// Uses service role key to bypass RLS (table is locked down for anon/client)
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('school_mpesa_transactions')
      .select('id, phone, amount, checkout_request_id, merchant_request_id, status, result_desc, mpesa_receipt, result_code, student_id, created_at')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return NextResponse.json({ transactions: data || [] });
  } catch (err: any) {
    console.error('GET /api/transactions/mpesa error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

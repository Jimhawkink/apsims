export const dynamic = 'force-dynamic';
// /api/debug/mpesa-tx — diagnoses school_mpesa_transactions table access
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

    const results: any = {
      serviceRoleKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    };

    // 1. Try reading from school_mpesa_transactions
    const { data: rows, error: readErr } = await supabase
      .from('school_mpesa_transactions')
      .select('id, phone, amount, status, checkout_request_id, created_at')
      .limit(5);
    results.read = { success: !readErr, rowCount: rows?.length, error: readErr?.message };

    // 2. Try a test insert
    const testCheckoutId = `TEST-${Date.now()}`;
    const { data: inserted, error: insertErr } = await supabase
      .from('school_mpesa_transactions')
      .insert([{
        checkout_request_id: testCheckoutId,
        phone: '254712345678',
        amount: 1,
        status: 'pending',
        result_code: 0,
        result_desc: 'Debug test row',
      }])
      .select('id');
    results.insert = { success: !insertErr, inserted: inserted?.[0], error: insertErr?.message };

    // 3. If inserted, delete the test row
    if (inserted?.[0]?.id) {
      await supabase.from('school_mpesa_transactions').delete().eq('id', inserted[0].id);
      results.cleanup = 'Test row deleted';
    }

    // 4. Check school_fee_payments
    const { error: feeReadErr } = await supabase
      .from('school_fee_payments')
      .select('id')
      .limit(1);
    results.feePaymentsReadable = !feeReadErr;
    results.feePaymentsError = feeReadErr?.message;

    return NextResponse.json(results);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

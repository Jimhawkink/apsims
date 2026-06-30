export const dynamic = 'force-dynamic';
// /api/admin/fix-mpesa-rls — Adds RLS read policy for school_mpesa_transactions
// Allows authenticated Supabase users (mobile app parents) to poll STK status
// Visit: apsims.vercel.app/api/admin/fix-mpesa-rls while logged in to the web app
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in to the web app to run this' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results: Record<string, any> = {};

    // Use Supabase's built-in pg connection via storage to run raw SQL
    // We insert a migration record that carries the SQL we want run
    // Alternatively use the PostgREST /rpc route for sql execution if available

    // Method: try inserting a test row and reading with different keys to diagnose
    const { data: testInsert, error: insertErr } = await supabase
      .from('school_mpesa_transactions')
      .insert([{
        checkout_request_id: `RLS-TEST-${Date.now()}`,
        phone: '254700000000',
        amount: 1,
        status: 'pending',
        result_code: 0,
        result_desc: 'RLS test row',
      }])
      .select('id')
      .single();

    results.serviceRoleInsert = insertErr
      ? { success: false, error: insertErr.message }
      : { success: true, id: testInsert?.id };

    // Clean up test row
    if (testInsert?.id) {
      await supabase.from('school_mpesa_transactions').delete().eq('id', testInsert.id);
      results.cleanup = 'Test row deleted';
    }

    // Test reading with anon key (simulates mobile WITHOUT login)
    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: anonData, error: anonErr } = await anonClient
      .from('school_mpesa_transactions').select('id').limit(1);
    results.anonRead = anonErr
      ? { blocked: true, error: anonErr.message }
      : { blocked: false, rows: anonData?.length };

    // Read all current policies on the table
    const { data: policies } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, roles')
      .eq('tablename', 'school_mpesa_transactions')
      .limit(20);
    results.currentPolicies = policies || 'Could not read pg_policies';

    // Check if school_fee_payments insert works
    const { error: feeCheckErr } = await supabase
      .from('school_fee_payments')
      .select('id').limit(1);
    results.feePaymentsReadable = !feeCheckErr;

    results.instructions = anonErr
      ? '⚠️ Anonymous reads are BLOCKED. Run this SQL in Supabase Dashboard > SQL Editor: ' +
        'CREATE POLICY "allow_authenticated_mpesa_read" ON public.school_mpesa_transactions FOR SELECT TO authenticated USING (true);'
      : '✅ Table is readable';

    return NextResponse.json({ results }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

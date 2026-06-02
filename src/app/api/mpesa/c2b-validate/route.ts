import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// M-Pesa C2B (Customer-to-Business) Validation Endpoint
// Safaricom calls this BEFORE processing a paybill payment.
// We must respond within 8 seconds with: {"ResultCode":"0","ResultDesc":"Accepted"}
// ─────────────────────────────────────────────────────────────────────────────

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('📲 M-Pesa C2B Validation:', JSON.stringify(body));

    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,   // This is the account ref — e.g. student admission no
      InvoiceNumber,
      OrgAccountBalance,
      ThirdPartyTransID,
      MSISDN,          // Customer phone
      FirstName,
      MiddleName,
      LastName,
    } = body;

    const supabase = supabaseAdmin();

    // Look up the student by admission number (BillRefNumber)
    const admNo = String(BillRefNumber || '').trim().toUpperCase();
    const { data: student } = await supabase
      .from('school_students')
      .select('id, first_name, last_name, status')
      .ilike('admission_no', admNo)
      .single();

    // Log the incoming validation request
    try {
      await supabase.from('school_mpesa_c2b_logs').insert([{
        trans_id:        TransID,
        trans_time:      TransTime,
        trans_amount:    Number(TransAmount),
        bill_ref:        BillRefNumber,
        msisdn:          MSISDN,
        first_name:      FirstName,
        last_name:       LastName,
        student_id:      student?.id || null,
        student_matched: !!student,
        validation_status: 'accepted',
        raw_payload:     body,
      }]);
    } catch (_) { /* table may not exist yet */ }

    // If student not found — still accept (don't bounce M-Pesa)
    // Safaricom will still process it; we handle mismatch in confirmation
    if (!student) {
      console.warn(`⚠️ C2B Validation: No student found for ref "${admNo}" — accepting anyway`);
    }

    // Always return accepted to Safaricom
    return NextResponse.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('C2B Validation Error:', err);
    // Still return accepted — never reject at validation (Safaricom requirement)
    return NextResponse.json({ ResultCode: '0', ResultDesc: 'Accepted' });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'C2B Validation endpoint active ✅' });
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// M-Pesa C2B (Customer-to-Business) Confirmation Endpoint
// Safaricom calls this AFTER the transaction is fully processed.
// This is the REAL payment — create fee payment record here.
// ─────────────────────────────────────────────────────────────────────────────

const supabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('✅ M-Pesa C2B Confirmation received:', JSON.stringify(body));

    const {
      TransactionType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      MSISDN,
      FirstName,
      MiddleName,
      LastName,
    } = body;

    const supabase = supabaseAdmin();
    const amount = Number(TransAmount);
    const admNo = String(BillRefNumber || '').trim().toUpperCase();
    const payerName = [FirstName, MiddleName, LastName].filter(Boolean).join(' ');

    // 1. Check for duplicate (idempotency)
    const { data: existing } = await supabase
      .from('school_fee_payments')
      .select('id')
      .eq('mpesa_receipt', TransID)
      .single();

    if (existing) {
      console.log(`🔁 Duplicate C2B ignored: ${TransID}`);
      return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // 2. Find student
    const { data: student } = await supabase
      .from('school_students')
      .select('id, first_name, last_name, form_id')
      .ilike('admission_no', admNo)
      .single();

    // 3. Get current active term
    const { data: term } = await supabase
      .from('school_terms')
      .select('id, term_name')
      .eq('is_current', true)
      .single();

    // 4. Parse M-Pesa transaction date (format: YYYYMMDDHHmmss)
    let paymentDate = new Date().toISOString().split('T')[0];
    if (TransTime && String(TransTime).length === 14) {
      const ts = String(TransTime);
      paymentDate = `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)}`;
    }

    // 5. Insert fee payment record
    const { data: payment, error: payErr } = await supabase
      .from('school_fee_payments')
      .insert([{
        student_id:     student?.id || null,
        amount:         amount,
        amount_paid:    amount,
        payment_method: 'M-Pesa',
        mpesa_receipt:  TransID,
        mpesa_phone:    MSISDN,
        mpesa_name:     payerName,
        reference_no:   BillRefNumber,
        payment_date:   paymentDate,
        term_id:        term?.id || null,
        notes:          `C2B M-Pesa from ${payerName} (${MSISDN}). Ref: ${BillRefNumber}`,
        received_by:    'M-Pesa Auto',
      }])
      .select('id')
      .single();

    if (payErr) {
      console.error('Fee payment insert error:', payErr.message);
    } else {
      console.log(`✅ Fee payment created: ID ${payment?.id}, KES ${amount} for ${admNo}`);
    }

    // 6. Log to C2B log table
    try {
      await supabase.from('school_mpesa_c2b_logs').upsert([{
        trans_id:           TransID,
        trans_time:         TransTime,
        trans_amount:       amount,
        bill_ref:           BillRefNumber,
        msisdn:             MSISDN,
        first_name:         FirstName,
        last_name:          LastName,
        student_id:         student?.id || null,
        student_matched:    !!student,
        confirmation_status: payment ? 'recorded' : 'failed',
        fee_payment_id:     payment?.id || null,
        raw_payload:        body,
      }], { onConflict: 'trans_id' });
    } catch (_) { /* table may not exist yet */ }

    // 7. Create real-time notification
    if (student) {
      try {
        await supabase.from('school_notifications').insert([{
          type:       'fee_payment',
          title:      `💚 M-Pesa Fee Payment Received`,
          message:    `${student.first_name} ${student.last_name} paid KES ${amount.toLocaleString()} via M-Pesa (${TransID})`,
          icon:       '💚',
          color:      '#10b981',
          link:       `/dashboard/students/${student.id}`,
          student_id: student.id,
          is_global:  true,
        }]);
      } catch (_) { /* skip if table missing */ }
    }

    // 8. Send SMS confirmation to parent
    const parentPhone = MSISDN?.replace(/^254/, '0') || MSISDN;
    const studentName = student
      ? `${student.first_name} ${student.last_name}`
      : admNo;
    const smsMsg = `Dear ${payerName}, your M-Pesa payment of KES ${amount.toLocaleString()} for ${studentName} has been received. Receipt: ${TransID}. Thank you! - APSIMS`;

    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: parentPhone, message: smsMsg }),
    }).catch(() => {}); // fire & forget

    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err: any) {
    console.error('C2B Confirmation Error:', err.message);
    // Must still return success to Safaricom
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'C2B Confirmation endpoint active ✅' });
}

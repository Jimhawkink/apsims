export const dynamic = 'force-dynamic';
// /api/payments/record-manual
// Called by the parent mobile app when user enters an M-Pesa code manually.
// Uses service_role key — the mobile client (anon) CANNOT write to school_fee_payments.
// All validation happens here server-side.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Valid M-Pesa transaction code patterns (alphanumeric, 10+ chars)
const VALID_CODE_RE = /^[A-Z0-9]{8,16}$/;

function genReceipt(): string {
  return `MANUAL-${String(Date.now()).slice(-8)}`;
}

export async function POST(req: NextRequest) {
  try {
    // 🔒 Always use service_role key — never anon key — for payment writes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!  // service_role ONLY — no fallback
    );

    const body = await req.json();
    const { studentId, amount, mpesaCode, paymentMethod, recordedBy, phone } = body;

    // ── Input validation ──────────────────────────────────────────────────
    if (!studentId || isNaN(Number(studentId))) {
      return NextResponse.json({ error: 'Invalid student ID' }, { status: 400 });
    }
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }
    if (Number(amount) > 500_000) {
      return NextResponse.json({ error: 'Amount exceeds maximum allowed (KES 500,000)' }, { status: 400 });
    }
    if (!mpesaCode || typeof mpesaCode !== 'string') {
      return NextResponse.json({ error: 'M-Pesa transaction code is required' }, { status: 400 });
    }

    const cleanCode = mpesaCode.trim().toUpperCase();

    // 🔒 Reject obviously fake codes
    if (!VALID_CODE_RE.test(cleanCode)) {
      return NextResponse.json({
        error: 'Invalid M-Pesa code format. Must be 8-16 alphanumeric characters (e.g. QFX12345AB)'
      }, { status: 400 });
    }

    // 🔒 Reject internal system IDs being passed as codes
    if (cleanCode.startsWith('WS_CO_') || cleanCode.startsWith('CW') || 
        cleanCode.startsWith('APSIMS') || cleanCode.startsWith('MPESA-') ||
        cleanCode.startsWith('KCB-') || cleanCode.startsWith('MANUAL-')) {
      return NextResponse.json({ error: 'Invalid code — please enter the code from your M-Pesa SMS' }, { status: 400 });
    }

    // ── Verify student exists ────────────────────────────────────────────
    const { data: student } = await supabase
      .from('school_students')
      .select('id, first_name, last_name, admission_number')
      .eq('id', Number(studentId))
      .maybeSingle();

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // ── Deduplicate — prevent double-recording the same code ────────────
    const { data: existing } = await supabase
      .from('school_fee_payments')
      .select('id, amount')
      .or(`mpesa_code.eq.${cleanCode},reference_number.eq.${cleanCode}`)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: `Code ${cleanCode} already recorded (KES ${existing.amount})`,
      });
    }

    // ── Get current term ────────────────────────────────────────────────
    const { data: termData } = await supabase
      .from('school_terms')
      .select('id')
      .eq('is_current', true)
      .limit(1)
      .maybeSingle();

    const currentYear = new Date().getFullYear();
    const receiptNo   = genReceipt();
    const method      = paymentMethod || 'M-Pesa';

    // ── Insert via service_role — RLS allows this ───────────────────────
    const payload = {
      student_id:       Number(studentId),
      amount:           Number(amount),
      payment_date:     new Date().toISOString().split('T')[0],
      payment_method:   method,
      receipt_number:   receiptNo,
      mpesa_code:       cleanCode,
      reference_number: cleanCode,
      term_id:          termData?.id || null,
      year:             currentYear,
      notes:            `Manual entry. Code: ${cleanCode}. Recorded by: ${recordedBy || 'Parent Portal'}. Phone: ${phone || 'N/A'}`,
    };

    const { error: insertErr } = await supabase
      .from('school_fee_payments')
      .insert([payload]);

    if (insertErr) {
      console.error('record-manual insert error:', insertErr.message);
      return NextResponse.json({ error: `Could not record payment: ${insertErr.message}` }, { status: 500 });
    }

    console.log(`✅ Manual payment recorded: student=${studentId} KES=${amount} code=${cleanCode}`);

    return NextResponse.json({
      success: true,
      receiptNumber: receiptNo,
      message: `KES ${amount} recorded for ${student.first_name} ${student.last_name}`,
    });

  } catch (err: any) {
    console.error('record-manual error:', err.message);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

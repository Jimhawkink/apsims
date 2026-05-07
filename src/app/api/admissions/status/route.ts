import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ─── GET /api/admissions/status?ref=ADM-2026-000001 ───
// Public endpoint — no auth required
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get('ref')?.trim();

  if (!ref) {
    return NextResponse.json({ error: 'ref query parameter is required' }, { status: 400 });
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('school_admission_applications')
    .select('reference_number, status, submitted_at, review_notes, student_first_name, student_last_name')
    .eq('reference_number', ref)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Application not found' }, { status: 404 });

  return NextResponse.json({
    data: {
      reference_number: data.reference_number,
      status: data.status,
      submitted_at: data.submitted_at,
      review_notes: data.review_notes,
      student_name: `${data.student_first_name} ${data.student_last_name}`,
    },
  });
}

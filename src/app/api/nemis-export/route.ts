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

// ─── GET /api/nemis-export ───
// Export active students as NEMIS-format CSV
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin or Principal role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const formId = searchParams.get('form_id');

  const supabase = getServiceClient();

  let query = supabase
    .from('school_students')
    .select(`
      admission_number,
      first_name,
      middle_name,
      last_name,
      date_of_birth,
      gender,
      nemis_no,
      birth_cert_no,
      county,
      sub_county,
      form_id,
      stream_id,
      school_forms(form_name),
      school_streams(stream_name)
    `)
    .eq('status', 'Active')
    .order('first_name', { ascending: true });

  if (formId) {
    query = query.eq('form_id', Number(formId));
  }

  const { data: students, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ─── Build CSV ───
  const headers = [
    'admission_number',
    'first_name',
    'middle_name',
    'last_name',
    'date_of_birth',
    'gender',
    'nemis_no',
    'birth_cert_no',
    'form_name',
    'stream_name',
    'county',
    'sub_county',
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    // Escape double quotes and wrap in quotes if contains comma, newline, or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = (students || []).map((student: any) => [
    escapeCSV(student.admission_number),
    escapeCSV(student.first_name),
    escapeCSV(student.middle_name),
    escapeCSV(student.last_name),
    escapeCSV(student.date_of_birth),
    escapeCSV(student.gender),
    escapeCSV(student.nemis_no),
    escapeCSV(student.birth_cert_no),
    escapeCSV(student.school_forms?.form_name),
    escapeCSV(student.school_streams?.stream_name),
    escapeCSV(student.county),
    escapeCSV(student.sub_county),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');

  // ─── Build filename with today's date ───
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const filename = `NEMIS_Export_${today}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}


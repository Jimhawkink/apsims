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

/**
 * GET /api/knec-registration
 * Export KCSE exam registration data in KNEC-required format
 * 
 * KNEC requires for KCSE registration:
 * - Index Number, Student Name, Gender, DOB
 * - Subject codes for all registered subjects
 * - School KNEC code, Sub-county code
 * 
 * Query params:
 * - form_id: Required — typically Form 4 for KCSE
 * - year: Registration year (default: current year)
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const allowedRoles = ['Admin', 'Principal', 'DOS'];
  if (!allowedRoles.map((r: string) => r.toLowerCase()).includes(session.role?.toLowerCase())) {
    return NextResponse.json({ error: 'Forbidden: Admin, Principal, or DOS role required' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const formId = searchParams.get('form_id');
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  if (!formId) {
    return NextResponse.json({ error: 'form_id is required (typically Form 4 for KCSE)' }, { status: 400 });
  }

  const supabase = getServiceClient();

  // ─── Fetch school details ───
  const { data: schoolDetails } = await supabase
    .from('school_details')
    .select('school_name, knec_code, sub_county_code, county, sub_county')
    .limit(1)
    .single();

  // ─── Fetch Form 4 students ───
  const { data: students, error: studentsError } = await supabase
    .from('school_students')
    .select(`
      id, admission_number, nemis_no, birth_cert_no,
      first_name, middle_name, last_name,
      gender, date_of_birth, 
      nationality, county, sub_county,
      guardian_name, guardian_phone, guardian_relationship,
      form_id, stream_id,
      school_forms(form_name),
      school_streams(stream_name)
    `)
    .eq('form_id', Number(formId))
    .eq('status', 'Active')
    .order('first_name');

  if (studentsError) {
    return NextResponse.json({ error: studentsError.message }, { status: 500 });
  }

  // ─── Fetch subject-teacher assignments to determine which subjects each student takes ───
  const { data: subjectTeachers } = await supabase
    .from('school_subject_teachers')
    .select('subject_id, form_id, school_subjects(subject_name, subject_code)')
    .eq('form_id', Number(formId));

  // Get unique subject codes for this form
  const formSubjects = [...new Map(
    (subjectTeachers || []).map((st: any) => [
      st.subject_id,
      { code: st.school_subjects?.subject_code, name: st.school_subjects?.subject_name }
    ])
  ).values()];

  // ─── Fetch all subjects as fallback ───
  const { data: allSubjects } = await supabase
    .from('school_subjects')
    .select('id, subject_name, subject_code')
    .order('subject_name');

  // ─── Build KNEC registration rows ───
  const registrationRows = (students || []).map((student: any, index: number) => {
    const form = student.school_forms;
    const stream = student.school_streams;
    
    // Generate index number: KNEC_CODE/YEAR/SEQUENCE
    const knecCode = schoolDetails?.knec_code || 'XXXXX';
    const indexNo = `${knecCode}/${year}/${String(index + 1).padStart(3, '0')}`;

    return {
      index_number: indexNo,
      knec_code: knecCode,
      sub_county_code: schoolDetails?.sub_county_code || '',
      school_name: schoolDetails?.school_name || '',
      admission_number: student.admission_number || '',
      upi: student.nemis_no || '',
      birth_cert_no: student.birth_cert_no || '',
      surname: student.last_name || '',
      first_name: student.first_name || '',
      middle_name: student.middle_name || '',
      full_name: [student.first_name, student.middle_name, student.last_name]
        .filter(Boolean).join(' '),
      gender: student.gender === 'Male' ? 'M' : student.gender === 'Female' ? 'F' : student.gender || '',
      date_of_birth: student.date_of_birth || '',
      nationality: student.nationality || 'Kenyan',
      county: student.county || schoolDetails?.county || '',
      sub_county: student.sub_county || schoolDetails?.sub_county || '',
      guardian_name: student.guardian_name || '',
      guardian_phone: student.guardian_phone || '',
      guardian_relationship: student.guardian_relationship || '',
      form: form?.form_name || '',
      stream: stream?.stream_name || '',
      registration_year: Number(year),
      // Subject codes — will be filled based on what subjects are taught in this form
      subjects: formSubjects.map((s: any) => s.code).filter(Boolean).join(', '),
    };
  });

  // ─── Build CSV ───
  const headers = [
    'Index_Number', 'KNEC_Code', 'Sub_County_Code', 'School_Name',
    'Admission_No', 'UPI', 'Birth_Cert_No',
    'Surname', 'First_Name', 'Middle_Name',
    'Gender', 'DOB', 'Nationality',
    'County', 'Sub_County',
    'Guardian_Name', 'Guardian_Phone', 'Guardian_Relationship',
    'Form', 'Stream', 'Registration_Year', 'Subjects'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = registrationRows.map((row: any) =>
    headers.map(h => {
      const key = h.toLowerCase().replace(/\s+/g, '_');
      // Map header to row key
      const keyMap: Record<string, string> = {
        'index_number': 'index_number',
        'knec_code': 'knec_code',
        'sub_county_code': 'sub_county_code',
        'school_name': 'school_name',
        'admission_no': 'admission_number',
        'upi': 'upi',
        'birth_cert_no': 'birth_cert_no',
        'surname': 'surname',
        'first_name': 'first_name',
        'middle_name': 'middle_name',
        'gender': 'gender',
        'dob': 'date_of_birth',
        'nationality': 'nationality',
        'county': 'county',
        'sub_county': 'sub_county',
        'guardian_name': 'guardian_name',
        'guardian_phone': 'guardian_phone',
        'guardian_relationship': 'guardian_relationship',
        'form': 'form',
        'stream': 'stream',
        'registration_year': 'registration_year',
        'subjects': 'subjects',
      };
      return escapeCSV(row[keyMap[key] || key]);
    })
  );

  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(',')),
  ].join('\n');

  const today = new Date().toISOString().split('T')[0];
  const filename = `KCSE_Registration_${year}_${today}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

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
 * GET /api/knec-cba-export
 * Export CBC assessment data in KNEC CBA portal-compatible format
 * 
 * KNEC CBA Portal (https://cba.knec.ac.ke) requires:
 * - Student UPI (Unique Personal Identifier)
 * - Subject, Strand, Sub-strand
 * - Rubric Level (EE=Exceeding Expectations, ME=Meeting Expectations, AE=Approaching Expectations, BE=Below Expectations)
 * - Term and Year
 * 
 * Query params:
 * - form_id: Filter by form (optional)
 * - term_id: Filter by term (optional)
 * - subject_id: Filter by subject (optional)
 * - format: 'csv' (default) or 'json'
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
  const termId = searchParams.get('term_id');
  const subjectId = searchParams.get('subject_id');
  const exportFormat = searchParams.get('format') || 'csv';

  const supabase = getServiceClient();

  // ─── Fetch school details for header ───
  const { data: schoolDetails } = await supabase
    .from('school_details')
    .select('school_name, knec_code, sub_county_code')
    .limit(1)
    .single();

  // ─── Fetch CBC assessment data ───
  // CBC assessments are stored in school_exam_marks with CBC rubric levels
  let marksQuery = supabase
    .from('school_exam_marks')
    .select(`
      id,
      score,
      grade,
      remarks,
      exam_type,
      student_id,
      subject_id,
      term_id,
      school_students!inner(
        id, admission_number, nemis_no, first_name, middle_name, last_name,
        date_of_birth, gender, form_id, stream_id,
        school_forms(form_name, form_level),
        school_streams(stream_name)
      ),
      school_subjects!inner(subject_name, subject_code),
      school_terms!inner(term_name, year)
    `)
    .order('student_id');

  if (formId) {
    marksQuery = marksQuery.eq('school_students.form_id', Number(formId));
  }
  if (termId) {
    marksQuery = marksQuery.eq('term_id', Number(termId));
  }
  if (subjectId) {
    marksQuery = marksQuery.eq('subject_id', Number(subjectId));
  }

  const { data: marks, error } = await marksQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ─── Map rubric levels from grades/scores ───
  function mapToRubricLevel(grade: string | null, score: number | null): string {
    // CBC rubric levels
    const g = (grade || '').toUpperCase();
    if (['EE', 'EXCEEDING'].includes(g)) return 'EE';
    if (['ME', 'MEETING'].includes(g)) return 'ME';
    if (['AE', 'APPROACHING'].includes(g)) return 'AE';
    if (['BE', 'BELOW'].includes(g)) return 'BE';
    
    // Fallback: convert score to rubric level
    if (score !== null) {
      if (score >= 75) return 'EE';
      if (score >= 50) return 'ME';
      if (score >= 25) return 'AE';
      return 'BE';
    }
    
    return 'AE'; // Default
  }

  // ─── Build export data ───
  const exportRows = (marks || []).map((mark: any) => {
    const student = mark.school_students;
    const subject = mark.school_subjects;
    const term = mark.school_terms;
    const form = student?.school_forms;
    const stream = student?.school_streams;

    return {
      knec_code: schoolDetails?.knec_code || '',
      school_name: schoolDetails?.school_name || '',
      upi: student?.nemis_no || student?.admission_number || '',
      admission_number: student?.admission_number || '',
      student_name: [student?.first_name, student?.middle_name, student?.last_name]
        .filter(Boolean).join(' '),
      gender: student?.gender || '',
      date_of_birth: student?.date_of_birth || '',
      form: form?.form_name || '',
      form_level: form?.form_level || '',
      stream: stream?.stream_name || '',
      subject_code: subject?.subject_code || '',
      subject_name: subject?.subject_name || '',
      assessment_type: mark.exam_type || 'Formative',
      rubric_level: mapToRubricLevel(mark.grade, mark.score),
      score: mark.score || '',
      term: term?.term_name || '',
      year: term?.year || new Date().getFullYear(),
      remarks: mark.remarks || '',
    };
  });

  // ─── Return as JSON ───
  if (exportFormat === 'json') {
    return NextResponse.json({
      school: {
        name: schoolDetails?.school_name,
        knec_code: schoolDetails?.knec_code,
        sub_county_code: schoolDetails?.sub_county_code,
      },
      export_date: new Date().toISOString(),
      total_records: exportRows.length,
      data: exportRows,
    });
  }

  // ─── Build CSV ───
  const headers = [
    'KNEC_Code', 'School_Name', 'UPI', 'Admission_No', 'Student_Name',
    'Gender', 'DOB', 'Form', 'Form_Level', 'Stream',
    'Subject_Code', 'Subject_Name', 'Assessment_Type', 'Rubric_Level',
    'Score', 'Term', 'Year', 'Remarks'
  ];

  const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvRows = exportRows.map((row: any) => [
    escapeCSV(row.knec_code),
    escapeCSV(row.school_name),
    escapeCSV(row.upi),
    escapeCSV(row.admission_number),
    escapeCSV(row.student_name),
    escapeCSV(row.gender),
    escapeCSV(row.date_of_birth),
    escapeCSV(row.form),
    escapeCSV(row.form_level),
    escapeCSV(row.stream),
    escapeCSV(row.subject_code),
    escapeCSV(row.subject_name),
    escapeCSV(row.assessment_type),
    escapeCSV(row.rubric_level),
    escapeCSV(row.score),
    escapeCSV(row.term),
    escapeCSV(row.year),
    escapeCSV(row.remarks),
  ]);

  const csvContent = [
    headers.join(','),
    ...csvRows.map(row => row.join(',')),
  ].join('\n');

  const today = new Date().toISOString().split('T')[0];
  const filename = `KNEC_CBA_Export_${today}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

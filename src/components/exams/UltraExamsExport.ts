/**
 * UltraExamsExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for School Examinations & Academic Intelligence
 * School: ST. CATHERINE GIRL'S SCHOOL TEGAT (MoE Reg: 2566)
 */

import ExcelJS from 'exceljs';

export interface StudentRankExport {
  rank: number;
  name: string;
  admission_no: string;
  form_name: string;
  gender: string;
  avg_score: number;
  mean_grade: string;
  points: number;
  subject_count: number;
}

export interface SubjectStatExport {
  subject_name: string;
  subject_code: string;
  department: string;
  candidates: number;
  mean_score: number;
  pass_rate: number;
  grade_a_count: number;
  difficulty_index: string;
}

export interface AtRiskExport {
  rank: number;
  name: string;
  admission_no: string;
  form_name: string;
  avg_score: number;
  mean_grade: string;
  severity: string;
  weakest_subject: string;
  guardian_phone?: string;
}

export interface CBCCompetencyExport {
  learning_area: string;
  grade_level: string;
  ee_count: number;
  me_count: number;
  ae_count: number;
  be_count: number;
  meeting_target_rate: number;
}

export interface ExportExamsOptions {
  schoolName?: string;
  schoolMotto?: string;
  schoolRegNo?: string;
  schoolPostal?: string;
  academicYear?: number;
  meanScore: number;
  meanGrade: string;
  passRate: number;
  students: StudentRankExport[];
  subjects: SubjectStatExport[];
  atRisk: AtRiskExport[];
  cbcStats: CBCCompetencyExport[];
}

export async function exportUltraExamsExcel(options: ExportExamsOptions): Promise<void> {
  const {
    schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    schoolMotto = "Excellence in Discipline & Academic Integrity",
    schoolRegNo = "MoE Reg: 2566 | Bomet County",
    schoolPostal = "P.O. Box 45 - 20400, Bomet, Kenya",
    meanScore,
    meanGrade,
    passRate,
    students,
    subjects,
    atRisk,
    cbcStats,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Academic Intelligence Platform';
  workbook.created = new Date();

  const brandNavy = '1E1B4B';
  const brandIndigo = '4338CA';
  const brandEmerald = '065F46';
  const brandAmber = '92400E';
  const brandRose = '991B1B';

  const applyHeaderStyle = (
    sheet: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    maxCol: string,
    accentColor: string
  ) => {
    sheet.mergeCells(`A1:${maxCol}1`);
    const c1 = sheet.getCell('A1');
    c1.value = schoolName.toUpperCase();
    c1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentColor } };
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells(`A2:${maxCol}2`);
    const c2 = sheet.getCell('A2');
    c2.value = `${schoolMotto} | ${schoolRegNo} | ${schoolPostal}`;
    c2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFD1D5DB' } };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentColor } };
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    sheet.mergeCells(`A3:${maxCol}3`);
    const c3 = sheet.getCell('A3');
    c3.value = `${title} — Generated ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    c3.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1F2937' } };
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(3).height = 24;

    sheet.mergeCells(`A4:${maxCol}4`);
    const c4 = sheet.getCell('A4');
    c4.value = subtitle;
    c4.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF4B5563' } };
    c4.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(4).height = 18;
  };

  /* ─────────────────────────────────────────────────────────────
     SHEET 1: ACADEMIC OVERVIEW & KEY PERFORMANCE INDICATORS
  ───────────────────────────────────────────────────────────── */
  const ovSheet = workbook.addWorksheet('Academic Summary', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    ovSheet,
    'INSTITUTIONAL ACADEMIC PERFORMANCE & BENCHMARK AUDIT',
    'Official KNEC/MoE performance indicators, mean scores, pass rates, and grade distribution.',
    'F',
    brandNavy
  );

  ovSheet.mergeCells('A6:F6');
  const hKey = ovSheet.getCell('A6');
  hKey.value = 'CORE INSTITUTIONAL METRICS';
  hKey.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  hKey.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandIndigo } };
  hKey.alignment = { horizontal: 'left', vertical: 'middle' };
  ovSheet.getRow(6).height = 22;

  const kpis = [
    ['School Mean Score', `${meanScore.toFixed(1)}%`, 'KCSE Mean Grade Projection', meanGrade],
    ['Overall Pass Rate (≥50%)', `${passRate.toFixed(1)}%`, 'Total Assessed Candidates', students.length],
    ['Curriculum Standards', '8-4-4 & Kenya CBC', 'Quality Grades (A & B)', students.filter((s) => ['A', 'A-', 'B+', 'B', 'B-'].includes(s.mean_grade)).length],
    ['At-Risk Interventions', atRisk.length, 'Active Teaching Subjects', subjects.length],
  ];

  kpis.forEach((k, idx) => {
    const r = ovSheet.getRow(7 + idx);
    r.values = [k[0], k[1], '', k[2], k[3], ''];
    r.height = 20;
    r.font = { name: 'Calibri', size: 10 };
    r.getCell(1).font = { bold: true, color: { argb: 'FF374151' } };
    r.getCell(2).font = { bold: true, color: { argb: 'FF1E40AF' } };
    r.getCell(4).font = { bold: true, color: { argb: 'FF374151' } };
    r.getCell(5).font = { bold: true, color: { argb: 'FF065F46' } };
    r.eachCell((c) => {
      c.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
  });

  ovSheet.columns = [
    { width: 28 }, { width: 16 }, { width: 4 }, { width: 28 }, { width: 20 }, { width: 10 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 2: STUDENT MERIT LIST & RANKINGS
  ───────────────────────────────────────────────────────────── */
  const rankSheet = workbook.addWorksheet('Merit Rankings', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    rankSheet,
    'OFFICIAL STUDENT ACADEMIC MERIT REGISTER',
    'Comprehensive student rankings by overall score average, mean grade, and KNEC points.',
    'H',
    brandNavy
  );

  const rankHeaders = ['Rank #', 'Student Full Name', 'Admission No', 'Form / Class', 'Gender', 'Avg Score %', 'Mean Grade', 'KNEC Points'];
  const rankHeaderRow = rankSheet.getRow(6);
  rankHeaderRow.values = rankHeaders;
  rankHeaderRow.height = 24;
  rankHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandIndigo } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  let rowIdx = 7;
  students.forEach((s) => {
    const r = rankSheet.getRow(rowIdx);
    r.values = [
      s.rank,
      s.name,
      s.admission_no,
      s.form_name,
      s.gender,
      s.avg_score,
      s.mean_grade,
      s.points,
    ];
    r.height = 19;
    r.getCell(6).numFmt = '0.0"%"';
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'center' };
    r.getCell(7).alignment = { horizontal: 'center' };
    r.getCell(8).alignment = { horizontal: 'center' };

    if (['A', 'A-'].includes(s.mean_grade)) {
      r.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      r.getCell(7).font = { color: { argb: 'FF065F46' }, bold: true };
    } else if (['E', 'D-'].includes(s.mean_grade)) {
      r.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      r.getCell(7).font = { color: { argb: 'FF991B1B' }, bold: true };
    }

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  rankSheet.columns = [
    { width: 8 }, { width: 32 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 3: SUBJECT PERFORMANCE & DIFFICULTY REGISTER
  ───────────────────────────────────────────────────────────── */
  const subSheet = workbook.addWorksheet('Subject Performance', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    subSheet,
    'DEPARTMENTAL SUBJECT PERFORMANCE & DIFFICULTY INDEX',
    'Audited subject mean scores, pass rates, quality grades, and difficulty rankings.',
    'H',
    brandEmerald
  );

  const subHeaders = ['#', 'Subject Name', 'Subject Code', 'Department', 'Candidates', 'Mean Score %', 'Pass Rate %', 'Difficulty Level'];
  const subHeaderRow = subSheet.getRow(6);
  subHeaderRow.values = subHeaders;
  subHeaderRow.height = 24;
  subHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  rowIdx = 7;
  subjects.forEach((sb, i) => {
    const r = subSheet.getRow(rowIdx);
    r.values = [
      i + 1,
      sb.subject_name,
      sb.subject_code,
      sb.department,
      sb.candidates,
      sb.mean_score,
      sb.pass_rate,
      sb.difficulty_index,
    ];
    r.height = 19;
    r.getCell(6).numFmt = '0.0"%"';
    r.getCell(7).numFmt = '0.0"%"';
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'center' };
    r.getCell(8).alignment = { horizontal: 'center' };

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  subSheet.columns = [
    { width: 6 }, { width: 30 }, { width: 14 }, { width: 22 }, { width: 14 }, { width: 16 }, { width: 16 }, { width: 18 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 4: CBC COMPETENCY DISTRIBUTION (EE, ME, AE, BE)
  ───────────────────────────────────────────────────────────── */
  const cbcSheet = workbook.addWorksheet('CBC Competencies', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    cbcSheet,
    'KENYA CBC COMPETENCY EVALUATION REGISTER',
    'Exceeding Expectations (EE), Meeting Expectations (ME), Approaching (AE), Below (BE) distribution.',
    'G',
    brandIndigo
  );

  const cbcHeaders = ['#', 'Learning Area', 'Cohort / Grade', 'Exceeding (EE)', 'Meeting (ME)', 'Approaching (AE)', 'Below (BE)'];
  const cbcHeaderRow = cbcSheet.getRow(6);
  cbcHeaderRow.values = cbcHeaders;
  cbcHeaderRow.height = 24;
  cbcHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandIndigo } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  rowIdx = 7;
  cbcStats.forEach((c, i) => {
    const r = cbcSheet.getRow(rowIdx);
    r.values = [
      i + 1,
      c.learning_area,
      c.grade_level,
      c.ee_count,
      c.me_count,
      c.ae_count,
      c.be_count,
    ];
    r.height = 19;
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'center' };
    r.getCell(6).alignment = { horizontal: 'center' };
    r.getCell(7).alignment = { horizontal: 'center' };

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  cbcSheet.columns = [
    { width: 6 }, { width: 32 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 5: AT-RISK INTERVENTION REGISTER
  ───────────────────────────────────────────────────────────── */
  const riskSheet = workbook.addWorksheet('At-Risk Interventions', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    riskSheet,
    'PRIORITY ACADEMIC INTERVENTIONS & REMEDIAL REGISTER',
    'Early-warning detection of students scoring below 40% with immediate remedial intervention flags.',
    'H',
    brandRose
  );

  const riskHeaders = ['#', 'Student Full Name', 'Admission No', 'Form / Class', 'Average Score %', 'Grade', 'Risk Severity', 'Weakest Subject'];
  const riskHeaderRow = riskSheet.getRow(6);
  riskHeaderRow.values = riskHeaders;
  riskHeaderRow.height = 24;
  riskHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDC2626' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  rowIdx = 7;
  atRisk.forEach((ar, i) => {
    const r = riskSheet.getRow(rowIdx);
    r.values = [
      i + 1,
      ar.name,
      ar.admission_no,
      ar.form_name,
      ar.avg_score,
      ar.mean_grade,
      ar.severity,
      ar.weakest_subject,
    ];
    r.height = 19;
    r.getCell(5).numFmt = '0.0"%"';
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(6).alignment = { horizontal: 'center' };
    r.getCell(7).alignment = { horizontal: 'center' };

    if (ar.severity === 'Critical') {
      r.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      r.getCell(7).font = { color: { argb: 'FF991B1B' }, bold: true };
    }

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  riskSheet.columns = [
    { width: 6 }, { width: 32 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 10 }, { width: 16 }, { width: 24 }
  ];

  /* ─────────────────────────────────────────────────────────────
     DOWNLOAD WORKBOOK
  ───────────────────────────────────────────────────────────── */
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `APSIMS_Academic_Analytics_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

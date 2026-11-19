// Super Ultra-Premium Admissions Excel Export Engine (ExcelJS)
// Includes Header Styling, Auto-Sizing Column Widths, Zebra Striping, and Multi-Sheet Workbooks

export interface ExportApplication {
  id: number;
  reference_number: string;
  status: string;
  student_first_name: string;
  student_middle_name?: string;
  student_last_name: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  county?: string;
  sub_county?: string;
  village_estate?: string;
  form_applied_for?: number | string;
  previous_school?: string;
  previous_school_county?: string;
  kcpe_index_number?: string;
  kcpe_total_marks?: number;
  kcpe_year?: number;
  guardian_full_name?: string;
  guardian_relationship?: string;
  guardian_phone?: string;
  guardian_alt_phone?: string;
  guardian_email?: string;
  guardian_national_id?: string;
  guardian_occupation?: string;
  guardian_county?: string;
  blood_group?: string;
  has_disability?: boolean;
  disability_details?: string;
  allergies?: string;
  medical_conditions?: string;
  converted_student_id?: number;
  created_at: string;
  [key: string]: any;
}

const formDisplay = (v?: number | string) => {
  const n = Number(v);
  if (n === 10) return 'Grade 10 (CBC)';
  if (n === 11) return 'Grade 11 (CBC)';
  if (n === 12) return 'Grade 12 (CBC)';
  if (n >= 7 && n <= 9) return `Grade ${n} (JSS CBC)`;
  if (n >= 1 && n <= 4) return `Form ${n} (8-4-4)`;
  return v ? `Form/Grade ${v}` : '—';
};

const calcAge = (dob?: string) => {
  if (!dob) return '—';
  const d = new Date(dob);
  const n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a > 0 ? `${a} yrs` : '—';
};

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
};

/**
 * Export Applications to Super Premium Multi-Sheet Excel Workbook with ExcelJS
 */
export async function exportAdmissionsWorkbook(
  applications: ExportApplication[],
  schoolName = 'APSIMS Academy & Senior School'
) {
  // Dynamically load exceljs to keep bundle lightweight
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'APSIMS Admissions Command Center';
  wb.lastModifiedBy = 'Admissions Director';
  wb.created = new Date();
  wb.modified = new Date();

  const brandFill: any = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Royal Navy Blue
  };

  const headerFont: any = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const zebraEvenFill: any = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  const borderStyle: any = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  /* ─────────────────────────────────────────────────────────────
     SHEET 1: ALL APPLICATIONS REGISTER
  ────────────────────────────────────────────────────────────── */
  const ws1 = wb.addWorksheet('All Applications', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  // Title Banner
  ws1.mergeCells('A1:P1');
  const titleCell = ws1.getCell('A1');
  titleCell.value = `${schoolName} — OFFICIAL ONLINE ADMISSIONS REGISTER (${new Date().getFullYear()})`;
  titleCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF0F172A' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws1.getRow(1).height = 28;

  const columnsDef = [
    { header: '#', key: 'seq', width: 6 },
    { header: 'Reference No', key: 'ref_no', width: 18 },
    { header: 'Applicant Full Name', key: 'name', width: 28 },
    { header: 'Gender', key: 'gender', width: 10 },
    { header: 'Date of Birth', key: 'dob', width: 14 },
    { header: 'Age', key: 'age', width: 10 },
    { header: 'Curriculum & Class', key: 'form', width: 22 },
    { header: 'KCPE Marks', key: 'kcpe_marks', width: 14 },
    { header: 'KCPE Index', key: 'kcpe_index', width: 16 },
    { header: 'Previous School', key: 'prev_school', width: 28 },
    { header: 'Guardian Name', key: 'guardian_name', width: 24 },
    { header: 'Guardian Phone', key: 'guardian_phone', width: 16 },
    { header: 'Guardian Email', key: 'guardian_email', width: 26 },
    { header: 'County', key: 'county', width: 16 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Submission Date', key: 'created_at', width: 16 },
  ];

  ws1.getRow(2).values = columnsDef.map((c) => c.header);
  ws1.getRow(2).height = 28;

  // Style Header Row
  ws1.getRow(2).eachCell((cell) => {
    cell.fill = brandFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderStyle;
  });

  // Populate Data Rows
  applications.forEach((a, idx) => {
    const rowNumber = idx + 3;
    const fullName = [a.student_first_name, a.student_middle_name, a.student_last_name].filter(Boolean).join(' ');
    const row = ws1.addRow([
      idx + 1,
      a.reference_number || `ADM-${a.id}`,
      fullName,
      a.gender || '—',
      formatDate(a.date_of_birth),
      calcAge(a.date_of_birth),
      formDisplay(a.form_applied_for),
      a.kcpe_total_marks ? Number(a.kcpe_total_marks) : '—',
      a.kcpe_index_number || '—',
      a.previous_school || '—',
      a.guardian_full_name || '—',
      a.guardian_phone || '—',
      a.guardian_email || '—',
      a.county || '—',
      a.status || 'Submitted',
      formatDate(a.created_at),
    ]);

    row.height = 22;

    // Apply Zebra striping and borders
    const isEven = idx % 2 === 1;
    row.eachCell((cell, colNumber) => {
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: [1, 4, 6, 8, 15, 16].includes(colNumber) ? 'center' : 'left',
      };
      if (isEven) {
        cell.fill = zebraEvenFill;
      }
      // Highlight status
      if (colNumber === 15) {
        if (a.status === 'Approved') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF15803D' } };
        } else if (a.status === 'Rejected') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB91C1C' } };
        } else if (a.status === 'Under Review') {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFB45309' } };
        }
      }
    });
  });

  // Auto-size columns based on maximum cell content
  columnsDef.forEach((colDef, colIdx) => {
    let maxLength = colDef.header.length;
    ws1.getColumn(colIdx + 1).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLength) {
          maxLength = valStr.length;
        }
      }
    });
    ws1.getColumn(colIdx + 1).width = Math.max(colDef.width, Math.min(maxLength + 4, 45));
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 2: APPROVED FOR ADMISSION
  ────────────────────────────────────────────────────────────── */
  const approvedList = applications.filter((a) => a.status === 'Approved');
  const ws2 = wb.addWorksheet('Approved for Admission', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  ws2.mergeCells('A1:L1');
  const titleCell2 = ws2.getCell('A1');
  titleCell2.value = `${schoolName} — APPROVED APPLICANTS (OFFERED PROVISIONAL ADMISSION)`;
  titleCell2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF15803D' } };
  titleCell2.alignment = { vertical: 'middle', horizontal: 'left' };
  titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
  ws2.getRow(1).height = 28;

  const appCols = ['#', 'Ref No', 'Student Name', 'Gender', 'Target Class', 'KCPE Marks', 'Index No', 'Guardian Name', 'Guardian Phone', 'County', 'Admitted To System', 'Date Approved'];
  ws2.getRow(2).values = appCols;
  ws2.getRow(2).height = 26;
  ws2.getRow(2).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderStyle;
  });

  approvedList.forEach((a, idx) => {
    const fullName = [a.student_first_name, a.student_middle_name, a.student_last_name].filter(Boolean).join(' ');
    const row = ws2.addRow([
      idx + 1,
      a.reference_number,
      fullName,
      a.gender || '—',
      formDisplay(a.form_applied_for),
      a.kcpe_total_marks || '—',
      a.kcpe_index_number || '—',
      a.guardian_full_name || '—',
      a.guardian_phone || '—',
      a.county || '—',
      a.converted_student_id ? `YES (ID: ${a.converted_student_id})` : 'AWAITING ENROLMENT',
      formatDate(a.reviewed_at || a.created_at),
    ]);
    row.height = 22;
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };
    });
  });

  // Auto-size sheet 2
  appCols.forEach((_, colIdx) => {
    let maxLength = 12;
    ws2.getColumn(colIdx + 1).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1) {
        const valStr = cell.value ? String(cell.value) : '';
        if (valStr.length > maxLength) maxLength = valStr.length;
      }
    });
    ws2.getColumn(colIdx + 1).width = Math.min(maxLength + 4, 38);
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 3: INTAKE ANALYTICS & SUMMARY
  ────────────────────────────────────────────────────────────── */
  const ws3 = wb.addWorksheet('Intake Analytics');
  ws3.views = [{ showGridLines: true }];

  ws3.mergeCells('A1:F1');
  const titleCell3 = ws3.getCell('A1');
  titleCell3.value = `${schoolName} — ADMISSIONS FUNNEL & INTAKE ANALYTICS`;
  titleCell3.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF1E293B' } };
  titleCell3.alignment = { vertical: 'middle' };
  ws3.getRow(1).height = 32;

  // Status Metrics
  const counts = {
    total: applications.length,
    new: applications.filter((a) => a.status === 'Submitted').length,
    review: applications.filter((a) => a.status === 'Under Review').length,
    approved: applications.filter((a) => a.status === 'Approved').length,
    rejected: applications.filter((a) => a.status === 'Rejected').length,
    waitlist: applications.filter((a) => a.status === 'Waitlisted').length,
    admitted: applications.filter((a) => !!a.converted_student_id).length,
  };

  const statHeaderRow = ws3.addRow(['METRIC / FUNNEL STAGE', 'APPLICANTS COUNT', '% OF TOTAL INTAKE']);
  statHeaderRow.height = 24;
  statHeaderRow.eachCell((cell) => {
    cell.fill = brandFill;
    cell.font = headerFont;
    cell.border = borderStyle;
  });

  const stats = [
    ['Total Applications Received', counts.total, '100.0%'],
    ['New / Awaiting First Review', counts.new, counts.total ? `${((counts.new / counts.total) * 100).toFixed(1)}%` : '0%'],
    ['Under Active Review', counts.review, counts.total ? `${((counts.review / counts.total) * 100).toFixed(1)}%` : '0%'],
    ['Approved for Provisional Admission', counts.approved, counts.total ? `${((counts.approved / counts.total) * 100).toFixed(1)}%` : '0%'],
    ['Officially Admitted & Placed into Class', counts.admitted, counts.total ? `${((counts.admitted / counts.total) * 100).toFixed(1)}%` : '0%'],
    ['Waitlisted Candidates', counts.waitlist, counts.total ? `${((counts.waitlist / counts.total) * 100).toFixed(1)}%` : '0%'],
    ['Rejected Applications', counts.rejected, counts.total ? `${((counts.rejected / counts.total) * 100).toFixed(1)}%` : '0%'],
  ];

  stats.forEach(([lbl, cnt, pct]) => {
    const r = ws3.addRow([lbl, cnt, pct]);
    r.height = 20;
    r.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 10 };
    });
  });

  ws3.getColumn(1).width = 42;
  ws3.getColumn(2).width = 22;
  ws3.getColumn(3).width = 22;

  // Trigger download in browser
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `APSIMS_Admissions_Register_${new Date().getFullYear()}_${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate and download an Official Admissions Import Excel Template (.xlsx)
 */
export async function downloadAdmissionsTemplate() {
  const XLSX = await import('xlsx');

  const headers = [
    'First Name',
    'Middle Name',
    'Last Name',
    'Gender',
    'Date of Birth (YYYY-MM-DD)',
    'Form / Grade (1-12)',
    'KCPE Index Number',
    'KCPE Total Marks',
    'KCPE Year',
    'Previous Primary School',
    'Guardian Full Name',
    'Guardian Phone',
    'Guardian Email',
    'Guardian National ID',
    'County',
    'Blood Group',
  ];

  const sampleRows = [
    [
      'BRIAN',
      'KIPROTICH',
      'KOECH',
      'Male',
      '2010-04-15',
      1,
      '12345678001',
      386,
      2025,
      'St. Andrews Academy',
      'FELIX KOECH',
      '0712345075',
      'felix.koech@gmail.com',
      '28475932',
      'Kericho',
      'O+',
    ],
    [
      'FAITH',
      'WANJIRU',
      'MWANGI',
      'Female',
      '2010-09-22',
      1,
      '12345678002',
      402,
      2025,
      'Moi Forces Academy',
      'MARY MWANGI',
      '0722334455',
      'mary.mwangi@yahoo.com',
      '24893114',
      'Nairobi',
      'A+',
    ],
    [
      'EMMANUEL',
      'OMONDI',
      'ODHIAMBO',
      'Male',
      '2009-11-05',
      10, // CBC Grade 10
      '12345678003',
      345,
      2025,
      'Kisumu Junior School',
      'PETER ODHIAMBO',
      '0733445566',
      'peter.odhiambo@gmail.com',
      '19827364',
      'Kisumu',
      'B+',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);

  // Set column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 3, 16) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Admissions Template');

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `APSIMS_Admissions_Import_Template.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

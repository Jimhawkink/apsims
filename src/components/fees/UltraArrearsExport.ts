/**
 * UltraArrearsExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for Student Arrears & Carried-Forward Balances
 * Uses ExcelJS with auto-sized columns, royal navy headers (#1E3A8A), zebra fills, and currency formats.
 */

import ExcelJS from 'exceljs';

export interface ArrearsExportItem {
  index: number;
  admNo: string;
  fullName: string;
  gender?: string;
  curriculumTrack: string;
  formName: string;
  streamName: string;
  guardianPhone?: string;
  expectedFees: number;
  paidFees: number;
  netArrears: number;
  agingBucket: '0-30' | '31-60' | '61-90' | '90+' | 'Never';
  lastPaymentDate?: string;
  status: string;
}

export interface ArrearsFormSummary {
  formName: string;
  curriculumTrack: string;
  totalStudents: number;
  arrearsCount: number;
  arrearsRatePct: number;
  totalExpected: number;
  totalPaid: number;
  totalArrears: number;
}

export interface ArrearsAgingSummary {
  bucket: string;
  label: string;
  studentCount: number;
  totalAmount: number;
  pctOfTotalArrears: number;
  actionProtocol: string;
}

export async function exportUltraArrearsExcel({
  schoolName = 'ALPHA PREMIER SCHOOL',
  termName = 'Academic Term',
  records,
  formSummaries,
  agingSummaries,
  totalArrearsSum,
  totalPaidSum,
}: {
  schoolName?: string;
  termName?: string;
  records: ArrearsExportItem[];
  formSummaries: ArrearsFormSummary[];
  agingSummaries: ArrearsAgingSummary[];
  totalArrearsSum: number;
  totalPaidSum: number;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Financial Terminal';
  workbook.lastModifiedBy = 'APSIMS Arrears Command';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Common styles
  const navyHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Royal Navy Blue
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 10,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const zebraFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  const moneyFormat = 'KES #,##0';

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 1: STUDENT ARREARS & BALANCES LEDGER
  // ═════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Arrears Ledger', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  // Title Block
  sheet1.mergeCells('A1:L1');
  const t1 = sheet1.getCell('A1');
  t1.value = `${schoolName.toUpperCase()} — FEE ARREARS & HISTORICAL BALANCES LEDGER`;
  t1.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  sheet1.getRow(1).height = 28;

  sheet1.mergeCells('A2:L2');
  const s1 = sheet1.getCell('A2');
  s1.value = `Term: ${termName}  •  Students in Arrears: ${records.length}  •  Total Arrears: KES ${totalArrearsSum.toLocaleString('en-KE')}  •  Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  s1.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  sheet1.getRow(2).height = 18;
  sheet1.getRow(3).height = 8; // Spacer

  // Header Row
  const headers1 = [
    '#',
    'Adm No',
    'Student Full Name',
    'Track',
    'Form / Grade',
    'Stream',
    'Guardian Phone',
    'Expected Fees',
    'Total Paid',
    'Net Arrears',
    'Aging Bracket',
    'Last Payment Date',
  ];

  const headerRow1 = sheet1.getRow(4);
  headerRow1.values = headers1;
  headerRow1.height = 24;
  headerRow1.eachCell((cell) => {
    cell.fill = navyHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = thinBorder;
  });

  sheet1.getCell('C4').alignment = { horizontal: 'left', vertical: 'middle' };
  sheet1.getCell('H4').alignment = { horizontal: 'right', vertical: 'middle' };
  sheet1.getCell('I4').alignment = { horizontal: 'right', vertical: 'middle' };
  sheet1.getCell('J4').alignment = { horizontal: 'right', vertical: 'middle' };

  // Data Rows
  records.forEach((r, idx) => {
    const row = sheet1.addRow([
      r.index,
      r.admNo,
      r.fullName,
      r.curriculumTrack,
      r.formName,
      r.streamName,
      r.guardianPhone || '—',
      r.expectedFees,
      r.paidFees,
      r.netArrears,
      r.agingBucket,
      r.lastPaymentDate || '—',
    ]);
    row.height = 20;

    if (idx % 2 === 1) {
      row.eachCell((cell) => (cell.fill = zebraFill));
    }

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.alignment = { vertical: 'middle' };
    });

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(2).font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF4338CA' } };
    row.getCell(3).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(7).font = { name: 'Consolas', size: 9 };

    // Money formats
    [8, 9, 10].forEach((colIdx) => {
      const c = row.getCell(colIdx);
      c.numFmt = moneyFormat;
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    // Highlight arrears
    row.getCell(10).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };

    // Aging pill
    const agingCell = row.getCell(11);
    agingCell.alignment = { horizontal: 'center' };
    if (r.agingBucket === '90+' || r.agingBucket === 'Never') {
      agingCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
    } else if (r.agingBucket === '61-90') {
      agingCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFC2410C' } };
    } else {
      agingCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF047857' } };
    }
  });

  // Totals Row
  const totalRowIndex = sheet1.rowCount + 1;
  const totRow = sheet1.addRow([
    'TOTALS',
    '',
    `${records.length} Students`,
    '',
    '',
    '',
    '',
    records.reduce((acc, r) => acc + r.expectedFees, 0),
    totalPaidSum,
    totalArrearsSum,
    '',
    '',
  ]);
  totRow.height = 24;
  sheet1.mergeCells(`A${totalRowIndex}:B${totalRowIndex}`);
  totRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
    cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
  });

  [8, 9, 10].forEach((colIdx) => {
    const c = totRow.getCell(colIdx);
    c.numFmt = moneyFormat;
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  });
  totRow.getCell(10).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF991B1B' } };

  // Auto-size columns
  sheet1.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength && cell.row > 3) maxLength = val.length;
    });
    column.width = Math.max(maxLength + 4, 11);
  });
  sheet1.getColumn(1).width = 6;
  sheet1.getColumn(3).width = 28;
  sheet1.getColumn(7).width = 16;
  sheet1.getColumn(10).width = 18;

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 2: FORM-LEVEL CONCENTRATION
  // ═════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Summary by Form', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:G1');
  const t2 = sheet2.getCell('A1');
  t2.value = `${schoolName.toUpperCase()} — ARREARS CONCENTRATION BY FORM / GRADE`;
  t2.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  sheet2.getRow(1).height = 26;

  sheet2.getRow(3).values = [
    'Form / Grade',
    'Track',
    'Total Enrolled',
    'Students in Arrears',
    'Arrears Rate (%)',
    'Total Paid (KES)',
    'Total Arrears (KES)',
  ];
  sheet2.getRow(3).height = 22;
  sheet2.getRow(3).eachCell((cell) => {
    cell.fill = navyHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  formSummaries.forEach((f, idx) => {
    const row = sheet2.addRow([
      f.formName,
      f.curriculumTrack,
      f.totalStudents,
      f.arrearsCount,
      f.arrearsRatePct / 100,
      f.totalPaid,
      f.totalArrears,
    ]);
    row.height = 20;
    if (idx % 2 === 1) row.eachCell((c) => (c.fill = zebraFill));
    row.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Segoe UI', size: 9.5 };
      c.alignment = { vertical: 'middle' };
    });
    row.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).numFmt = '0.0%';
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(6).numFmt = moneyFormat;
    row.getCell(6).alignment = { horizontal: 'right' };
    row.getCell(7).numFmt = moneyFormat;
    row.getCell(7).alignment = { horizontal: 'right' };
    row.getCell(7).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
  });

  sheet2.columns.forEach((col) => (col.width = 18));
  sheet2.getColumn(1).width = 22;

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 3: AGING RISK MATRIX
  // ═════════════════════════════════════════════════════════════════════════
  const sheet3 = workbook.addWorksheet('Aging Matrix', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:F1');
  const t3 = sheet3.getCell('A1');
  t3.value = `${schoolName.toUpperCase()} — ARREARS AGING ANALYSIS & RECOVERY PROTOCOLS`;
  t3.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  sheet3.getRow(1).height = 26;

  sheet3.getRow(3).values = [
    'Aging Bracket',
    'Description',
    'Student Count',
    'Total Debt Volume',
    '% Share of Total Arrears',
    'Recommended Recovery Action',
  ];
  sheet3.getRow(3).height = 22;
  sheet3.getRow(3).eachCell((cell) => {
    cell.fill = navyHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  agingSummaries.forEach((a, idx) => {
    const row = sheet3.addRow([
      a.bucket,
      a.label,
      a.studentCount,
      a.totalAmount,
      a.pctOfTotalArrears / 100,
      a.actionProtocol,
    ]);
    row.height = 22;
    if (idx % 2 === 1) row.eachCell((c) => (c.fill = zebraFill));
    row.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Segoe UI', size: 9.5 };
      c.alignment = { vertical: 'middle' };
    });
    row.getCell(1).font = { name: 'Segoe UI', size: 10, bold: true };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).numFmt = moneyFormat;
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(4).font = { name: 'Segoe UI', size: 9.5, bold: true };
    row.getCell(5).numFmt = '0.0%';
    row.getCell(5).alignment = { horizontal: 'center' };
  });

  sheet3.columns.forEach((col) => (col.width = 22));
  sheet3.getColumn(6).width = 44;

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().split('T')[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName.replace(/\s+/g, '_')}_Arrears_Ledger_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

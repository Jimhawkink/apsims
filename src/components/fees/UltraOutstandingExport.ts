/**
 * UltraOutstandingExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for Student Fee Defaulters & Outstanding Balances
 * Uses ExcelJS with auto-sized columns, executive navy headers (#1E3A8A), zebra fills, and currency formats.
 */

import ExcelJS from 'exceljs';

export interface DefaulterExportItem {
  index: number;
  admNo: string;
  fullName: string;
  gender?: string;
  formName: string;
  streamName: string;
  guardianName?: string;
  guardianPhone?: string;
  curriculumTrack: string;
  totalPaid: number;
  term1Balance: number;
  term2Balance: number;
  term3Balance: number;
  annualBalance: number;
  riskTier: 'Mild' | 'Moderate' | 'Severe' | 'Critical';
  lastPaymentDate?: string;
}

export interface FormSummaryExportItem {
  formName: string;
  curriculumTrack: string;
  totalStudents: number;
  defaultersCount: number;
  defaultRatePct: number;
  totalCollected: number;
  totalOutstanding: number;
}

export interface AgingBracketExportItem {
  bracket: string;
  range: string;
  studentCount: number;
  totalAmount: number;
  pctOfTotalDebt: number;
  recommendedAction: string;
}

export async function exportUltraOutstandingExcel({
  schoolName = 'ALPHA PREMIER SCHOOL',
  termName = 'Current Term',
  defaulters,
  formSummaries,
  agingBrackets,
  totalPaidSum,
  totalOutstandingSum,
}: {
  schoolName?: string;
  termName?: string;
  defaulters: DefaulterExportItem[];
  formSummaries: FormSummaryExportItem[];
  agingBrackets: AgingBracketExportItem[];
  totalPaidSum: number;
  totalOutstandingSum: number;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Financial Terminal';
  workbook.lastModifiedBy = 'APSIMS Finance Command';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Helper styles
  const navyHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Executive Navy Blue
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
  // SHEET 1: DEFAULTERS LEDGER
  // ═════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Defaulters Ledger', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  // Title block
  sheet1.mergeCells('A1:N1');
  const titleCell = sheet1.getCell('A1');
  titleCell.value = `${schoolName.toUpperCase()} — OUTSTANDING FEES & ARREARS LEDGER`;
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet1.getRow(1).height = 28;

  sheet1.mergeCells('A2:N2');
  const subCell = sheet1.getCell('A2');
  subCell.value = `Term: ${termName}  •  Defaulters: ${defaulters.length} Students  •  Total Outstanding: KES ${totalOutstandingSum.toLocaleString('en-KE')}  •  Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  subCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'left', vertical: 'middle' };
  sheet1.getRow(2).height = 18;

  sheet1.getRow(3).height = 8; // Spacer

  // Header row (Row 4)
  const headers1 = [
    '#',
    'Adm No',
    'Student Full Name',
    'Track',
    'Form / Grade',
    'Stream',
    'Guardian Phone',
    'Total Paid',
    'Term 1 Bal',
    'Term 2 Bal',
    'Term 3 Bal',
    'Annual Balance',
    'Risk Tier',
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

  // Align specific headers
  sheet1.getCell('C4').alignment = { horizontal: 'left', vertical: 'middle' };
  sheet1.getCell('H4').alignment = { horizontal: 'right', vertical: 'middle' };
  sheet1.getCell('I4').alignment = { horizontal: 'right', vertical: 'middle' };
  sheet1.getCell('J4').alignment = { horizontal: 'right', vertical: 'middle' };
  sheet1.getCell('K4').alignment = { horizontal: 'right', vertical: 'middle' };
  sheet1.getCell('L4').alignment = { horizontal: 'right', vertical: 'middle' };

  // Data rows
  defaulters.forEach((item, idx) => {
    const row = sheet1.addRow([
      item.index,
      item.admNo,
      item.fullName,
      item.curriculumTrack,
      item.formName,
      item.streamName,
      item.guardianPhone || '—',
      item.totalPaid,
      item.term1Balance,
      item.term2Balance,
      item.term3Balance,
      item.annualBalance,
      item.riskTier,
      item.lastPaymentDate || '—',
    ]);
    row.height = 20;

    // Zebra striping
    if (idx % 2 === 1) {
      row.eachCell((cell) => {
        cell.fill = zebraFill;
      });
    }

    row.eachCell((cell) => {
      cell.border = thinBorder;
      cell.font = { name: 'Segoe UI', size: 9 };
      cell.alignment = { vertical: 'middle' };
    });

    // Specific alignments & formats
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF4338CA' } };
    row.getCell(3).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(7).font = { name: 'Consolas', size: 9 };

    // Money cells
    [8, 9, 10, 11, 12].forEach((colIdx) => {
      const c = row.getCell(colIdx);
      c.numFmt = moneyFormat;
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    });

    // Highlight annual balance
    const annCell = row.getCell(12);
    annCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };

    // Risk tier pill coloring
    const riskCell = row.getCell(13);
    riskCell.alignment = { horizontal: 'center', vertical: 'middle' };
    if (item.riskTier === 'Critical') {
      riskCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF991B1B' } };
    } else if (item.riskTier === 'Severe') {
      riskCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFC2410C' } };
    } else if (item.riskTier === 'Moderate') {
      riskCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FFB45309' } };
    } else {
      riskCell.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF047857' } };
    }
  });

  // Totals Row
  const totalRowIndex = sheet1.rowCount + 1;
  const totRow = sheet1.addRow([
    'TOTALS',
    '',
    `${defaulters.length} Defaulters`,
    '',
    '',
    '',
    '',
    totalPaidSum,
    defaulters.reduce((acc, d) => acc + d.term1Balance, 0),
    defaulters.reduce((acc, d) => acc + d.term2Balance, 0),
    defaulters.reduce((acc, d) => acc + d.term3Balance, 0),
    totalOutstandingSum,
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

  [8, 9, 10, 11, 12].forEach((colIdx) => {
    const c = totRow.getCell(colIdx);
    c.numFmt = moneyFormat;
    c.alignment = { horizontal: 'right', vertical: 'middle' };
  });
  totRow.getCell(12).font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF991B1B' } };

  // Auto-size columns
  sheet1.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength && Number(cell.row) > 3) maxLength = val.length;
    });
    column.width = Math.max(maxLength + 4, 11);
  });
  sheet1.getColumn(1).width = 6;
  sheet1.getColumn(3).width = 28;
  sheet1.getColumn(7).width = 16;
  sheet1.getColumn(12).width = 18;

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 2: FORM-LEVEL ARREARS SUMMARY
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
    'Default Rate (%)',
    'Total Collected (KES)',
    'Total Outstanding (KES)',
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
      f.defaultersCount,
      f.defaultRatePct / 100,
      f.totalCollected,
      f.totalOutstanding,
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

  // Auto-width for sheet 2
  sheet2.columns.forEach((col) => {
    col.width = 18;
  });
  sheet2.getColumn(1).width = 22;

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 3: AGING RISK BRACKETS
  // ═════════════════════════════════════════════════════════════════════════
  const sheet3 = workbook.addWorksheet('Aging Risk Matrix', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:F1');
  const t3 = sheet3.getCell('A1');
  t3.value = `${schoolName.toUpperCase()} — DEFAULTER AGING RISK BRACKETS & RECOVERY PROTOCOL`;
  t3.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
  sheet3.getRow(1).height = 26;

  sheet3.getRow(3).values = [
    'Risk Tier',
    'Arrears Balance Range',
    'Defaulter Count',
    'Total Debt Volume',
    '% Share of Total Debt',
    'Recommended Recovery Action',
  ];
  sheet3.getRow(3).height = 22;
  sheet3.getRow(3).eachCell((cell) => {
    cell.fill = navyHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  agingBrackets.forEach((b, idx) => {
    const row = sheet3.addRow([
      b.bracket,
      b.range,
      b.studentCount,
      b.totalAmount,
      b.pctOfTotalDebt / 100,
      b.recommendedAction,
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

  sheet3.columns.forEach((col) => {
    col.width = 22;
  });
  sheet3.getColumn(6).width = 44;

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().split('T')[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName.replace(/\s+/g, '_')}_Outstanding_Fees_Ledger_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

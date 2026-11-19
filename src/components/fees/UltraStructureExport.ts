/**
 * UltraStructureExport.ts
 * Enterprise 4-Sheet Excel Workbook Exporter for School Fee Structures & Vote Head Budgets
 * Built using ExcelJS with auto-sized columns, royal navy headers (#1E3A8A),
 * executive school title banners, KPI metric blocks, zebra striping, and standard KES currency formats.
 */

import ExcelJS from 'exceljs';

export interface StructureExportItem {
  index: number;
  category: string;
  formName: string;
  curriculumTrack: string;
  termName: string;
  year: number | string;
  description: string;
  amount: number;
}

export interface ClassMatrixExportItem {
  formName: string;
  curriculumTrack: string;
  term1Amount: number;
  term2Amount: number;
  term3Amount: number;
  annualTotal: number;
}

export interface VoteHeadSummaryExportItem {
  category: string;
  itemCount: number;
  totalAmount: number;
  pctOfTotal: number;
}

export interface ExportUltraStructureOptions {
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  academicYear?: string | number;
  structures: StructureExportItem[];
  matrixRows: ClassMatrixExportItem[];
  voteHeadSummaries: VoteHeadSummaryExportItem[];
}

export async function exportUltraStructureExcel({
  schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
  schoolAddress = 'P.O. Box 0000-00100, Nairobi, Kenya',
  schoolPhone = '+254 700 000 000',
  schoolEmail = 'bursar@alphaschool.ac.ke',
  academicYear = new Date().getFullYear(),
  structures,
  matrixRows,
  voteHeadSummaries,
}: ExportUltraStructureOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Financial Engine';
  workbook.lastModifiedBy = 'Finance Office / Bursar Desk';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Color Fills & Styles
  const navyHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Deep Royal Navy
  };

  const slateSubheaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF0F172A' }, // Slate 900
  };

  const kpiCardFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0FDF4' }, // Emerald 50
  };

  const zebraFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' }, // Slate 50
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const doubleBottomBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FF94A3B8' } },
    bottom: { style: 'double', color: { argb: 'FF0F172A' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const currencyFormat = '"KES "#,##0.00';

  const totalFeeLoad = structures.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const totalVoteHeads = voteHeadSummaries.length;
  const totalClasses = matrixRows.length;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: EXECUTIVE OVERVIEW & SCHEDULE SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Executive Overview', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet1.mergeCells('A1:G1');
  const titleCell = sheet1.getCell('A1');
  titleCell.value = `${schoolName.toUpperCase()} — OFFICIAL FEE STRUCTURE & BUDGET SCHEDULE`;
  titleCell.fill = navyHeaderFill;
  titleCell.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 42;

  // Subtitle Banner
  sheet1.mergeCells('A2:G2');
  const subCell = sheet1.getCell('A2');
  subCell.value = `ACADEMIC YEAR: ${academicYear} | ${schoolAddress} | Phone: ${schoolPhone} | Email: ${schoolEmail}`;
  subCell.fill = slateSubheaderFill;
  subCell.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 24;

  sheet1.addRow([]); // Blank spacer

  // Executive KPI Section
  sheet1.mergeCells('A4:C4');
  sheet1.getCell('A4').value = 'EXECUTIVE FEE STRUCTURE KPI SUMMARY';
  sheet1.getCell('A4').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

  const kpiRow1 = sheet1.addRow(['Total Scheduled Fee Load', 'Configured Vote Heads', 'Classes / Cohorts Configured', 'Total Line Items', 'Academic Year', 'Export Generated On']);
  kpiRow1.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF475569' } };
  kpiRow1.eachCell((c) => {
    c.fill = zebraFill;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });

  const kpiRow2 = sheet1.addRow([
    totalFeeLoad,
    totalVoteHeads,
    totalClasses,
    structures.length,
    academicYear,
    new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }),
  ]);
  kpiRow2.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  kpiRow2.eachCell((c) => {
    c.fill = kpiCardFill;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });
  kpiRow2.getCell(1).numFmt = currencyFormat;
  kpiRow2.getCell(1).font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FF15803D' } };
  sheet1.getRow(4).height = 20;
  sheet1.getRow(5).height = 22;
  sheet1.getRow(6).height = 30;

  sheet1.addRow([]); // Blank spacer

  // Term Breakdown Overview Table
  sheet1.mergeCells('A8:F8');
  sheet1.getCell('A8').value = 'TERMLY FEE LOAD DISTRIBUTION (ANNUAL AGGREGATE)';
  sheet1.getCell('A8').font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };

  const termHeaderRow = sheet1.addRow(['Academic Term', 'Term Status', 'Line Items', 'Cumulative Term Load (KES)', '% of Annual Total', 'Payment Window']);
  termHeaderRow.font = headerFont;
  termHeaderRow.eachCell((c) => {
    c.fill = navyHeaderFill;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });
  sheet1.getRow(9).height = 26;

  const term1Sum = matrixRows.reduce((acc, r) => acc + (r.term1Amount || 0), 0);
  const term2Sum = matrixRows.reduce((acc, r) => acc + (r.term2Amount || 0), 0);
  const term3Sum = matrixRows.reduce((acc, r) => acc + (r.term3Amount || 0), 0);
  const grandMatrixSum = term1Sum + term2Sum + term3Sum || 1;

  const termRowsData = [
    { name: 'Term 1', status: 'Completed', count: structures.filter(s => s.termName.toLowerCase().includes('term 1') || s.termName.includes('1')).length, sum: term1Sum, window: 'Opening Week - Day 1' },
    { name: 'Term 2', status: 'Completed', count: structures.filter(s => s.termName.toLowerCase().includes('term 2') || s.termName.includes('2')).length, sum: term2Sum, window: 'Opening Week - Day 1' },
    { name: 'Term 3', status: 'Active (Current)', count: structures.filter(s => s.termName.toLowerCase().includes('term 3') || s.termName.includes('3')).length, sum: term3Sum, window: 'Opening Week - Day 1' },
  ];

  termRowsData.forEach((t, i) => {
    const row = sheet1.addRow([
      t.name,
      t.status,
      t.count,
      t.sum,
      t.sum / grandMatrixSum,
      t.window,
    ]);
    row.font = { name: 'Segoe UI', size: 10 };
    row.eachCell((c, colNumber) => {
      c.border = thinBorder;
      if (i % 2 === 1) c.fill = zebraFill;
      if (colNumber === 4) {
        c.numFmt = currencyFormat;
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
        c.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 5) {
        c.numFmt = '0.0%';
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 3) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    sheet1.getRow(10 + i).height = 22;
  });

  // Term Total Row
  const termTotalRow = sheet1.addRow(['TOTAL ANNUAL SCHEDULE', '', structures.length, grandMatrixSum, 1, 'Full Academic Year']);
  termTotalRow.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
  termTotalRow.eachCell((c, colNumber) => {
    c.border = doubleBottomBorder;
    if (colNumber === 4) {
      c.numFmt = currencyFormat;
      c.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF15803D' } };
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (colNumber === 5) {
      c.numFmt = '0.0%';
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // Auto-size columns for sheet 1
  sheet1.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength && Number(cell.row) > 2) maxLength = val.length;
    });
    column.width = Math.max(maxLength + 4, 18);
  });
  sheet1.getColumn(1).width = 24;
  sheet1.getColumn(4).width = 26;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: DETAILED VOTE HEADS LEDGER
  // ══════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Vote Heads Ledger', {
    views: [{ showGridLines: true }],
  });

  // Header Banner
  sheet2.mergeCells('A1:H1');
  sheet2.getCell('A1').value = `${schoolName.toUpperCase()} — ITEMIZED FEE STRUCTURE LEDGER`;
  sheet2.getCell('A1').fill = navyHeaderFill;
  sheet2.getCell('A1').font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet2.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(1).height = 36;

  const headersSheet2 = [
    '#',
    'Vote Head / Category',
    'Class / Level',
    'Curriculum Track',
    'Academic Term',
    'Academic Year',
    'Description / Notes',
    'Amount (KES)',
  ];

  const headerRow2 = sheet2.addRow(headersSheet2);
  headerRow2.font = headerFont;
  headerRow2.eachCell((c) => {
    c.fill = navyHeaderFill;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });
  sheet2.getRow(2).height = 28;

  structures.forEach((item, idx) => {
    const row = sheet2.addRow([
      item.index || idx + 1,
      item.category,
      item.formName,
      item.curriculumTrack,
      item.termName,
      item.year,
      item.description || '—',
      item.amount,
    ]);

    row.font = { name: 'Segoe UI', size: 10 };
    row.eachCell((c, colNumber) => {
      c.border = thinBorder;
      if (idx % 2 === 1) c.fill = zebraFill;
      if (colNumber === 1 || colNumber === 5 || colNumber === 6) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 8) {
        c.numFmt = currencyFormat;
        c.alignment = { horizontal: 'right', vertical: 'middle' };
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
      }
    });
    sheet2.getRow(3 + idx).height = 20;
  });

  // Grand Total Row
  const totalRow2 = sheet2.addRow([
    '',
    `GRAND TOTAL (${structures.length} LINE ITEMS)`,
    '',
    '',
    '',
    '',
    '',
    totalFeeLoad,
  ]);
  totalRow2.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  totalRow2.eachCell((c, colNumber) => {
    c.border = doubleBottomBorder;
    if (colNumber === 8) {
      c.numFmt = currencyFormat;
      c.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF15803D' } };
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    }
  });
  sheet2.getRow(3 + structures.length).height = 26;

  // Auto-size columns for sheet 2
  sheet2.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength && Number(cell.row) > 1) maxLength = val.length;
    });
    column.width = Math.max(maxLength + 4, 12);
  });
  sheet2.getColumn(1).width = 6;
  sheet2.getColumn(2).width = 28;
  sheet2.getColumn(7).width = 30;
  sheet2.getColumn(8).width = 20;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 3: CLASS X TERM CROSS-TAB MATRIX
  // ══════════════════════════════════════════════════════════════════════════
  const sheet3 = workbook.addWorksheet('Class x Term Matrix', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:F1');
  sheet3.getCell('A1').value = `${schoolName.toUpperCase()} — CLASS-BY-CLASS TERMLY FEE SCHEDULE`;
  sheet3.getCell('A1').fill = navyHeaderFill;
  sheet3.getCell('A1').font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet3.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet3.getRow(1).height = 36;

  const headersSheet3 = [
    'Class / Cohort Level',
    'Curriculum System',
    'Term 1 (KES)',
    'Term 2 (KES)',
    'Term 3 (KES)',
    'Annual Total (KES)',
  ];

  const headerRow3 = sheet3.addRow(headersSheet3);
  headerRow3.font = headerFont;
  headerRow3.eachCell((c) => {
    c.fill = navyHeaderFill;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });
  sheet3.getRow(2).height = 28;

  matrixRows.forEach((m, idx) => {
    const row = sheet3.addRow([
      m.formName,
      m.curriculumTrack,
      m.term1Amount,
      m.term2Amount,
      m.term3Amount,
      m.annualTotal,
    ]);
    row.font = { name: 'Segoe UI', size: 10 };
    row.eachCell((c, colNumber) => {
      c.border = thinBorder;
      if (idx % 2 === 1) c.fill = zebraFill;
      if (colNumber >= 3) {
        c.numFmt = currencyFormat;
        c.alignment = { horizontal: 'right', vertical: 'middle' };
        if (colNumber === 6) {
          c.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF15803D' } };
        }
      }
    });
    sheet3.getRow(3 + idx).height = 22;
  });

  // Matrix Total Row
  const matrixTotalRow = sheet3.addRow([
    'TOTAL PER TERM',
    'All Classes Combined',
    term1Sum,
    term2Sum,
    term3Sum,
    grandMatrixSum,
  ]);
  matrixTotalRow.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  matrixTotalRow.eachCell((c, colNumber) => {
    c.border = doubleBottomBorder;
    if (colNumber >= 3) {
      c.numFmt = currencyFormat;
      c.alignment = { horizontal: 'right', vertical: 'middle' };
      c.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF15803D' } };
    }
  });

  // Auto-size sheet 3
  sheet3.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength && Number(cell.row) > 1) maxLength = val.length;
    });
    column.width = Math.max(maxLength + 4, 18);
  });
  sheet3.getColumn(1).width = 24;
  sheet3.getColumn(6).width = 24;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 4: VOTE HEAD BUDGET DISTRIBUTION
  // ══════════════════════════════════════════════════════════════════════════
  const sheet4 = workbook.addWorksheet('Vote Head Breakdown', {
    views: [{ showGridLines: true }],
  });

  sheet4.mergeCells('A1:E1');
  sheet4.getCell('A1').value = `${schoolName.toUpperCase()} — VOTE HEAD BUDGET ALLOCATION & SHARES`;
  sheet4.getCell('A1').fill = navyHeaderFill;
  sheet4.getCell('A1').font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  sheet4.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  sheet4.getRow(1).height = 36;

  const headersSheet4 = [
    '#',
    'Vote Head Category',
    'Scheduled Items Count',
    'Total Allocated (KES)',
    '% Share of Total Budget',
  ];

  const headerRow4 = sheet4.addRow(headersSheet4);
  headerRow4.font = headerFont;
  headerRow4.eachCell((c) => {
    c.fill = navyHeaderFill;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });
  sheet4.getRow(2).height = 28;

  voteHeadSummaries.forEach((vh, idx) => {
    const row = sheet4.addRow([
      idx + 1,
      vh.category,
      vh.itemCount,
      vh.totalAmount,
      vh.pctOfTotal,
    ]);
    row.font = { name: 'Segoe UI', size: 10 };
    row.eachCell((c, colNumber) => {
      c.border = thinBorder;
      if (idx % 2 === 1) c.fill = zebraFill;
      if (colNumber === 1 || colNumber === 3) {
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNumber === 4) {
        c.numFmt = currencyFormat;
        c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF15803D' } };
        c.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (colNumber === 5) {
        c.numFmt = '0.0%';
        c.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
    sheet4.getRow(3 + idx).height = 20;
  });

  // Total Row Sheet 4
  const totalRow4 = sheet4.addRow([
    '',
    'TOTAL VOTE HEAD ALLOCATIONS',
    structures.length,
    totalFeeLoad,
    1,
  ]);
  totalRow4.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  totalRow4.eachCell((c, colNumber) => {
    c.border = doubleBottomBorder;
    if (colNumber === 4) {
      c.numFmt = currencyFormat;
      c.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF15803D' } };
      c.alignment = { horizontal: 'right', vertical: 'middle' };
    } else if (colNumber === 5) {
      c.numFmt = '0.0%';
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // Auto-size sheet 4
  sheet4.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength && Number(cell.row) > 1) maxLength = val.length;
    });
    column.width = Math.max(maxLength + 4, 16);
  });
  sheet4.getColumn(1).width = 6;
  sheet4.getColumn(2).width = 30;
  sheet4.getColumn(4).width = 24;

  // ── Trigger Instant Browser File Download ─────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const sanitizedSchool = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  anchor.download = `${sanitizedSchool}_Fee_Structure_${academicYear}_Enterprise.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

/**
 * UltraVoteHeadsExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for Vote Heads & Fee Matrix
 * Generates official Microsoft Excel (.xlsx) workbooks with:
 * - Registered School Letterhead: ST. CATHERINE GIRL'S SCHOOL TEGAT
 * - Sheet 1: Vote Heads Official Registry (Code, Category, Priority, Status)
 * - Sheet 2: Fee Structure Matrix (Per Term & Annual Totals)
 * - Royal Navy Blue headers (#1E3A8A), zebra striping, bold KES accounting formats.
 */

import ExcelJS from 'exceljs';

export interface VoteHeadExportItem {
  id: number;
  code: string;
  name: string;
  category: string;
  priority: number;
  is_active: boolean;
  description?: string | null;
  color?: string | null;
}

export interface MatrixRowExportItem {
  voteHeadName: string;
  voteHeadCode: string;
  priority: number;
  termAmounts: Record<string, number>;
  annualTotal: number;
}

export interface ExportVoteHeadsOptions {
  schoolName?: string;
  schoolMotto?: string;
  academicYear: number;
  formName?: string;
  voteHeads: VoteHeadExportItem[];
  matrixRows?: MatrixRowExportItem[];
  termNames?: string[];
}

export async function exportUltraVoteHeadsExcel({
  schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
  schoolMotto = "Excellence in Education",
  academicYear = new Date().getFullYear(),
  formName = "All Classes",
  voteHeads,
  matrixRows = [],
  termNames = ['Term 1', 'Term 2', 'Term 3'],
}: ExportVoteHeadsOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Finance Suite';
  workbook.created = new Date();

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: VOTE HEADS REGISTRY
  // ══════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Vote Heads Registry', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet1.mergeCells('A1:G1');
  const title1 = sheet1.getCell('A1');
  title1.value = `OFFICIAL VOTE HEADS & FEE CATEGORIES REGISTER — ${schoolName.toUpperCase()}`;
  title1.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 30;

  sheet1.mergeCells('A2:G2');
  const sub1 = sheet1.getCell('A2');
  sub1.value = `Motto: "${schoolMotto}"  |  Academic Year: ${academicYear}  |  Generated: ${new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}`;
  sub1.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 20;

  sheet1.addRow([]);

  const headers1 = [
    '#',
    'Priority',
    'Code',
    'Vote Head Name',
    'Accounting Category',
    'Active Status',
    'Description / Allocation Rules',
  ];
  const headerRow1 = sheet1.addRow(headers1);
  headerRow1.height = 24;
  headerRow1.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const sortedHeads = [...voteHeads].sort((a, b) => a.priority - b.priority);

  sortedHeads.forEach((vh, idx) => {
    const row = sheet1.addRow([
      idx + 1,
      `#${vh.priority}`,
      vh.code,
      vh.name,
      vh.category || 'General',
      vh.is_active ? 'ACTIVE' : 'INACTIVE',
      vh.description || 'Standard institutional fee vote head',
    ]);
    row.height = 20;

    const isEven = idx % 2 === 0;
    const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNum === 1 || colNum === 2 || colNum === 3 || colNum === 6) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      if (colNum === 6) {
        if (vh.is_active) {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
        } else {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF64748B' } };
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: FEE STRUCTURE MATRIX
  // ══════════════════════════════════════════════════════════════════════════
  if (matrixRows.length > 0) {
    const sheet2 = workbook.addWorksheet('Fee Matrix Breakdown', {
      views: [{ showGridLines: true }],
    });

    const colSpanEnd = String.fromCharCode(65 + termNames.length + 3); // Dynamic end column letter

    sheet2.mergeCells(`A1:${colSpanEnd}1`);
    const title2 = sheet2.getCell('A1');
    title2.value = `FEE SCHEDULE MATRIX (${formName.toUpperCase()} · ${academicYear}) — ${schoolName.toUpperCase()}`;
    title2.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    title2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet2.getRow(1).height = 30;

    sheet2.addRow([]);

    const headers2 = ['#', 'Priority', 'Vote Head Code', 'Vote Head Name', ...termNames.map((t) => `${t} (KES)`), 'Annual Total (KES)'];
    const headerRow2 = sheet2.addRow(headers2);
    headerRow2.height = 24;
    headerRow2.eachCell((cell) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    matrixRows.forEach((rowItem, idx) => {
      const termVals = termNames.map((t) => rowItem.termAmounts[t] || 0);
      const row = sheet2.addRow([
        idx + 1,
        `#${rowItem.priority}`,
        rowItem.voteHeadCode,
        rowItem.voteHeadName,
        ...termVals,
        rowItem.annualTotal,
      ]);
      row.height = 20;

      const isEven = idx % 2 === 0;
      const bg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      row.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 9.5 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };

        if (colNum <= 3) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNum === 4) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
          cell.font = { name: 'Calibri', size: 9.5, bold: true };
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
          cell.font = { name: 'Calibri', size: 9.5, bold: true };
        }
      });
    });

    // Matrix Grand Total Footer
    const termSums = termNames.map((t) =>
      matrixRows.reduce((sum, r) => sum + (r.termAmounts[t] || 0), 0)
    );
    const grandAnnualTotal = matrixRows.reduce((sum, r) => sum + r.annualTotal, 0);

    const footerRow2 = sheet2.addRow([
      '',
      '',
      '',
      'ANNUAL GRAND TOTAL',
      ...termSums,
      grandAnnualTotal,
    ]);
    footerRow2.height = 24;
    footerRow2.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
      if (colNum >= 5) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });
  }

  // Auto-fit column widths
  [sheet1, workbook.getWorksheet('Fee Matrix Breakdown')].forEach((ws) => {
    if (!ws) return;
    ws.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen && len < 45) maxLen = len;
      });
      col.width = Math.min(36, maxLen + 3);
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const safeSchool = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  anchor.download = `${safeSchool}_Vote_Heads_Matrix_${academicYear}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

/**
 * UltraFeeLedgerExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for APSIMS Fee Ledger Hub
 * Generates an official Microsoft Excel (.xlsx) file with:
 * - Registered School Letterhead: ST. CATHERINE GIRL'S SCHOOL TEGAT
 * - Sheet 1: Student Fee Ledger
 * - Sheet 2: Dual-Track Class Breakdown (CBC Senior vs 8-4-4)
 * - Sheet 3: Defaulters Aging & Recovery Priority
 * - Royal Navy Blue headers (#1E3A8A), alternating row zebra striping,
 *   auto-fit column widths, and bold KES accounting currency formats.
 */

import ExcelJS from 'exceljs';

export interface LedgerExportStudent {
  admission_number?: string;
  admission_no?: string;
  first_name: string;
  last_name: string;
  formName: string;
  streamName?: string;
  systemTag: string; // 'CBC Senior' | '8-4-4 Sec' | 'JSS' | etc.
  annualTotal: number;
  totalPaid: number;
  balance: number;
  rate: number;
  guardian_phone?: string;
  parent_name?: string;
  guardian_name?: string;
}

export interface ClassSummaryExportItem {
  formName: string;
  systemTag: string;
  studentCount: number;
  expected: number;
  collected: number;
  arrears: number;
  recoveryRate: number;
}

export interface ExportLedgerOptions {
  schoolName?: string;
  schoolMotto?: string;
  termName?: string;
  students: LedgerExportStudent[];
  classSummaries?: ClassSummaryExportItem[];
}

export async function exportUltraFeeLedgerExcel({
  schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
  schoolMotto = "Excellence in Education",
  termName = "Academic Year 2026",
  students,
  classSummaries = [],
}: ExportLedgerOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Finance Suite';
  workbook.created = new Date();
  workbook.modified = new Date();

  const totalExpected = students.reduce((acc, s) => acc + (s.annualTotal || 0), 0);
  const totalPaid = students.reduce((acc, s) => acc + (s.totalPaid || 0), 0);
  const totalBalance = students.reduce((acc, s) => acc + (s.balance || 0), 0);
  const overallRate = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: COMPLETE STUDENT FEE LEDGER
  // ══════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Student Fee Ledger', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet1.mergeCells('A1:K1');
  const titleCell1 = sheet1.getCell('A1');
  titleCell1.value = `OFFICIAL STUDENT FEE LEDGER — ${schoolName.toUpperCase()}`;
  titleCell1.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 30;

  // Subtitle Banner
  sheet1.mergeCells('A2:K2');
  const subCell1 = sheet1.getCell('A2');
  subCell1.value = `Motto: "${schoolMotto}"  |  Term/Year: ${termName}  |  Generated on ${new Date().toLocaleDateString('en-KE', { dateStyle: 'full' })}`;
  subCell1.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  subCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  subCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 20;

  // Executive KPI summary row
  sheet1.mergeCells('A3:K3');
  const kpiCell1 = sheet1.getCell('A3');
  kpiCell1.value = `Total Learners: ${students.length.toLocaleString()}   |   Total Invoiced: KES ${Math.round(totalExpected).toLocaleString()}   |   Collected: KES ${Math.round(totalPaid).toLocaleString()}   |   Outstanding Arrears: KES ${Math.round(totalBalance).toLocaleString()}   |   Recovery Rate: ${overallRate}%`;
  kpiCell1.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
  kpiCell1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E7FF' } };
  kpiCell1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(3).height = 22;

  sheet1.addRow([]); // Blank spacer

  // Table Headers
  const headers1 = [
    '#',
    'Adm No',
    'Student Full Name',
    'Track',
    'Class / Form',
    'Annual Expected (KES)',
    'Total Paid (KES)',
    'Balance Due (KES)',
    'Recovery Rate',
    'Settlement Status',
    'Guardian Phone',
  ];

  const headerRow1 = sheet1.addRow(headers1);
  headerRow1.height = 24;
  headerRow1.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Rows
  students.forEach((st, idx) => {
    const status = st.balance === 0 ? 'CLEARED' : st.totalPaid > 0 ? 'PARTIAL' : 'IN ARREARS';
    const row = sheet1.addRow([
      idx + 1,
      st.admission_number || st.admission_no || '—',
      `${st.first_name} ${st.last_name}`,
      st.systemTag || 'General',
      st.formName || '—',
      st.annualTotal || 0,
      st.totalPaid || 0,
      st.balance || 0,
      `${st.rate || 0}%`,
      status,
      st.guardian_phone || '—',
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

      // Alignment and number formatting
      if (colNum === 1 || colNum === 2 || colNum === 4 || colNum === 9 || colNum === 10) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNum === 6 || colNum === 7 || colNum === 8) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
        cell.font = { name: 'Calibri', size: 9.5, bold: true };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Status highlights
      if (colNum === 10) {
        if (status === 'CLEARED') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        } else if (status === 'PARTIAL') {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFB45309' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFBEB' } };
        } else {
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
        }
      }
    });
  });

  // Footer Totals Row
  const footerRow1 = sheet1.addRow([
    '',
    '',
    `TOTALS (${students.length} Learners)`,
    '',
    '',
    totalExpected,
    totalPaid,
    totalBalance,
    `${overallRate}%`,
    '',
    '',
  ]);
  footerRow1.height = 24;
  footerRow1.eachCell((cell, colNum) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF0F172A' } },
      bottom: { style: 'double', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
    if (colNum === 6 || colNum === 7 || colNum === 8) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0';
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: DUAL-TRACK CLASS SUMMARY (CBC & 8-4-4)
  // ══════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Dual-Track Class Summary', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:G1');
  const titleCell2 = sheet2.getCell('A1');
  titleCell2.value = `DUAL-TRACK CLASS REVENUE & COLLECTION MATRIX — ${schoolName.toUpperCase()}`;
  titleCell2.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(1).height = 28;

  sheet2.addRow([]);

  const headers2 = [
    '#',
    'Class / Form Name',
    'Curriculum System',
    'Learners Count',
    'Expected Revenue (KES)',
    'Collected to Date (KES)',
    'Arrears Balance (KES)',
    'Recovery Rate',
  ];
  const headerRow2 = sheet2.addRow(headers2);
  headerRow2.height = 24;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  classSummaries.forEach((cs, idx) => {
    const row = sheet2.addRow([
      idx + 1,
      cs.formName,
      cs.systemTag,
      cs.studentCount,
      cs.expected,
      cs.collected,
      cs.arrears,
      `${cs.recoveryRate}%`,
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
      if (colNum === 1 || colNum === 3 || colNum === 4 || colNum === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNum === 5 || colNum === 6 || colNum === 7) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
        cell.font = { name: 'Calibri', size: 9.5, bold: true };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 3: DEFAULTERS AGING & RECOVERY PRIORITY
  // ══════════════════════════════════════════════════════════════════════════
  const sheet3 = workbook.addWorksheet('Defaulters Recovery', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:H1');
  const titleCell3 = sheet3.getCell('A1');
  titleCell3.value = `PRIORITIZED DEFAULTERS & OUTSTANDING ARREARS LEDGER — ${schoolName.toUpperCase()}`;
  titleCell3.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } }; // Crimson
  titleCell3.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet3.getRow(1).height = 28;

  sheet3.addRow([]);

  const headers3 = [
    '#',
    'Risk Priority',
    'Adm No',
    'Student Full Name',
    'Class & Track',
    'Outstanding Arrears (KES)',
    'Recovery Rate',
    'Guardian Contact Phone',
  ];
  const headerRow3 = sheet3.addRow(headers3);
  headerRow3.height = 24;
  headerRow3.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF991B1B' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const defaulters = students
    .filter((s) => s.balance > 0)
    .sort((a, b) => b.balance - a.balance);

  defaulters.forEach((st, idx) => {
    const risk = st.balance >= 20000 ? '🚨 CRITICAL' : st.balance >= 10000 ? '⚠️ HIGH' : '⚡ MODERATE';
    const row = sheet3.addRow([
      idx + 1,
      risk,
      st.admission_number || st.admission_no || '—',
      `${st.first_name} ${st.last_name}`,
      `${st.formName} (${st.systemTag})`,
      st.balance,
      `${st.rate}%`,
      st.guardian_phone || '—',
    ]);
    row.height = 20;

    const isEven = idx % 2 === 0;
    const bg = isEven ? 'FFFFFFFF' : 'FFFEF2F2';

    row.eachCell((cell, colNum) => {
      cell.font = { name: 'Calibri', size: 9.5 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (colNum === 1 || colNum === 2 || colNum === 3 || colNum === 7 || colNum === 8) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (colNum === 6) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0';
        cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFDC2626' } };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }
    });
  });

  // Auto-fit column widths across all worksheets
  [sheet1, sheet2, sheet3].forEach((ws) => {
    ws.columns.forEach((col) => {
      let maxLen = 12;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = cell.value ? String(cell.value).length : 0;
        if (len > maxLen && len < 50) maxLen = len;
      });
      col.width = Math.min(35, maxLen + 3);
    });
  });

  // Generate binary and trigger client download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  const safeName = schoolName.replace(/[^a-zA-Z0-9]/g, '_');
  anchor.download = `${safeName}_Fee_Ledger_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

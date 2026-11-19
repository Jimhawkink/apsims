/**
 * UltraVoteHeadLedgerExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for Vote Head Ledger & Expenditure Journals
 * Registered School: ST. CATHERINE GIRL'S SCHOOL TEGAT
 */

import ExcelJS from 'exceljs';

export interface LedgerRowExportItem {
  code: string;
  name: string;
  category: string;
  priority: number;
  budgeted: number;
  feeIncome: number;
  capitation: number;
  totalIncome: number;
  expenses: number;
  balance: number;
  utilization: number;
  status: string;
}

export interface ExpenseJournalExportItem {
  id: number | string;
  expense_date: string;
  expense_name: string;
  vote_head: string;
  category: string;
  payment_method: string;
  amount: number;
  status?: string;
}

export interface ExportVoteHeadLedgerOptions {
  schoolName?: string;
  schoolMotto?: string;
  academicYear: number;
  termName?: string;
  ledgerRows: LedgerRowExportItem[];
  expenses?: ExpenseJournalExportItem[];
}

export async function exportUltraVoteHeadLedgerExcel({
  schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
  schoolMotto = "Excellence in Education",
  academicYear = new Date().getFullYear(),
  termName = "Academic Year",
  ledgerRows = [],
  expenses = [],
}: ExportVoteHeadLedgerOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Financial Suite';
  workbook.created = new Date();

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: VOTE HEAD LEDGER MASTER
  // ══════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Vote Head Ledger', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet1.mergeCells('A1:K1');
  const title1 = sheet1.getCell('A1');
  title1.value = `OFFICIAL VOTE HEAD ALLOCATION & EXPENDITURE LEDGER — ${schoolName.toUpperCase()}`;
  title1.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 32;

  sheet1.mergeCells('A2:K2');
  const sub1 = sheet1.getCell('A2');
  sub1.value = `"${schoolMotto}"  |  Academic Period: ${termName} · ${academicYear}  |  Official Ministry of Education Audit Ledger`;
  sub1.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 20;

  sheet1.addRow([]);

  // Column Headers
  const hRow1 = sheet1.addRow([
    '#',
    'Code',
    'Vote Head Name',
    'Category',
    'Priority',
    'Budgeted (KES)',
    'Fee Intake (KES)',
    'Total Inflow (KES)',
    'Expenses (KES)',
    'Net Balance (KES)',
    'Burn Rate (%)',
  ]);
  hRow1.height = 25;
  hRow1.eachCell((cell) => {
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

  // Add Data Rows
  ledgerRows.forEach((row, idx) => {
    const isEven = idx % 2 === 0;
    const r = sheet1.addRow([
      idx + 1,
      row.code,
      row.name,
      row.category,
      `P${row.priority}`,
      row.budgeted,
      row.feeIncome,
      row.totalIncome,
      row.expenses,
      row.balance,
      `${row.utilization}%`,
    ]);
    r.height = 21;

    r.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      if (!isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }

      // Numeric alignment & formatting
      if ([6, 7, 8, 9, 10].includes(colNumber)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      } else if ([1, 2, 5, 11].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      // Color balance column
      if (colNumber === 10) {
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: row.balance < 0 ? 'FFDC2626' : 'FF16A34A' },
        };
      }

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  });

  // Totals Row
  const totalBudgeted = ledgerRows.reduce((s, r) => s + r.budgeted, 0);
  const totalIncome = ledgerRows.reduce((s, r) => s + r.totalIncome, 0);
  const totalExpenses = ledgerRows.reduce((s, r) => s + r.expenses, 0);
  const totalBalance = totalIncome - totalExpenses;
  const overallRate = totalIncome > 0 ? Math.round((totalExpenses / totalIncome) * 100) : 0;

  const totRow = sheet1.addRow([
    '∑',
    'TOTALS',
    'GRAND TREASURY CONSOLIDATION',
    'ALL CATEGORIES',
    '—',
    totalBudgeted,
    ledgerRows.reduce((s, r) => s + r.feeIncome, 0),
    totalIncome,
    totalExpenses,
    totalBalance,
    `${overallRate}%`,
  ]);
  totRow.height = 24;
  totRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    if ([6, 7, 8, 9, 10].includes(colNumber)) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0.00';
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF1E293B' } },
      bottom: { style: 'double', color: { argb: 'FF1E293B' } },
    };
  });

  // Column Widths
  sheet1.getColumn(1).width = 5;
  sheet1.getColumn(2).width = 12;
  sheet1.getColumn(3).width = 28;
  sheet1.getColumn(4).width = 18;
  sheet1.getColumn(5).width = 10;
  sheet1.getColumn(6).width = 17;
  sheet1.getColumn(7).width = 17;
  sheet1.getColumn(8).width = 18;
  sheet1.getColumn(9).width = 17;
  sheet1.getColumn(10).width = 18;
  sheet1.getColumn(11).width = 14;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: ITEMIZED EXPENDITURE VOUCHERS JOURNAL
  // ══════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Expenditure Journals', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:G1');
  const title2 = sheet2.getCell('A1');
  title2.value = `ITEMIZED EXPENDITURE VOUCHERS REGISTER — ${schoolName.toUpperCase()}`;
  title2.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(1).height = 30;

  sheet2.mergeCells('A2:G2');
  const sub2 = sheet2.getCell('A2');
  sub2.value = `Disbursement audit trail against vote heads  |  Total Vouchers: ${expenses.length}`;
  sub2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  sub2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(2).height = 20;

  sheet2.addRow([]);

  const hRow2 = sheet2.addRow([
    '#',
    'Expense Date',
    'Description / Payee',
    'Vote Head Allocated',
    'Category',
    'Payment Channel',
    'Amount (KES)',
  ]);
  hRow2.height = 24;
  hRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  if (expenses.length === 0) {
    const emptyRow = sheet2.addRow([
      '—',
      '—',
      'No expenditure disbursements recorded for selected period',
      '—',
      '—',
      '—',
      0,
    ]);
    emptyRow.getCell(3).font = { italic: true, color: { argb: 'FF94A3B8' } };
  } else {
    expenses.forEach((e, idx) => {
      const r = sheet2.addRow([
        idx + 1,
        e.expense_date || '—',
        e.expense_name,
        e.vote_head || 'General',
        e.category || 'Recurrent',
        e.payment_method || 'Cash / Cheque',
        Number(e.amount || 0),
      ]);
      r.height = 20;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(5).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(7).numFmt = '#,##0.00';
    });
  }

  // Auto-fit column widths
  sheet2.getColumn(1).width = 5;
  sheet2.getColumn(2).width = 14;
  sheet2.getColumn(3).width = 34;
  sheet2.getColumn(4).width = 24;
  sheet2.getColumn(5).width = 18;
  sheet2.getColumn(6).width = 18;
  sheet2.getColumn(7).width = 18;

  // Download browser trigger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Vote_Head_Ledger_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * UltraPaymentPlansExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for Fee Payment Plans & Installment Pledges
 * Registered School: ST. CATHERINE GIRL'S SCHOOL TEGAT
 */

import ExcelJS from 'exceljs';

export interface PlanExportItem {
  id: number;
  studentName: string;
  admissionNo: string;
  formName: string;
  guardianName: string;
  guardianPhone: string;
  planType: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  progressPct: number;
  nextDueDate: string;
  status: string;
}

export interface InstallmentExportItem {
  planId: number;
  studentName: string;
  admissionNo: string;
  installmentNo: number;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balance: number;
  status: string;
  paidDate: string | null;
}

export interface ExportPaymentPlansOptions {
  schoolName?: string;
  schoolMotto?: string;
  academicYear: number;
  termName?: string;
  plans: PlanExportItem[];
  installments?: InstallmentExportItem[];
}

export async function exportUltraPaymentPlansExcel({
  schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
  schoolMotto = "Excellence in Education",
  academicYear = new Date().getFullYear(),
  termName = "Academic Year",
  plans = [],
  installments = [],
}: ExportPaymentPlansOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Financial Suite';
  workbook.created = new Date();

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: PAYMENT PLANS REGISTER
  // ══════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Payment Plans Register', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheet1.mergeCells('A1:L1');
  const title1 = sheet1.getCell('A1');
  title1.value = `OFFICIAL FEE PAYMENT PLANS & PLEDGES REGISTER — ${schoolName.toUpperCase()}`;
  title1.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 32;

  sheet1.mergeCells('A2:L2');
  const sub1 = sheet1.getCell('A2');
  sub1.value = `"${schoolMotto}"  |  Period: ${termName} · ${academicYear}  |  Parent Installment Undertakings`;
  sub1.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  sub1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 20;

  sheet1.addRow([]);

  // Column Headers
  const hRow1 = sheet1.addRow([
    '#',
    'Plan ID',
    'Student Name',
    'Adm No',
    'Class / Form',
    'Guardian',
    'Phone',
    'Plan Type',
    'Pledged (KES)',
    'Paid (KES)',
    'Balance (KES)',
    'Next Due Date',
    'Status',
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

  // Data Rows
  plans.forEach((p, idx) => {
    const isEven = idx % 2 === 0;
    const r = sheet1.addRow([
      idx + 1,
      `PLN-${p.id}`,
      p.studentName,
      p.admissionNo,
      p.formName,
      p.guardianName || '—',
      p.guardianPhone || '—',
      p.planType,
      p.totalAmount,
      p.paidAmount,
      p.balance,
      p.nextDueDate || '—',
      p.status,
    ]);
    r.height = 21;

    r.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10 };
      if (!isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }

      // Formatting
      if ([9, 10, 11].includes(colNumber)) {
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
        cell.numFmt = '#,##0.00';
      } else if ([1, 2, 4, 8, 12, 13].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle' };
      }

      if (colNumber === 11) {
        cell.font = {
          name: 'Calibri',
          size: 10,
          bold: true,
          color: { argb: p.balance > 0 ? 'FFDC2626' : 'FF16A34A' },
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
  const totalPledged = plans.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = plans.reduce((s, p) => s + p.paidAmount, 0);
  const totalBalance = plans.reduce((s, p) => s + p.balance, 0);

  const totRow = sheet1.addRow([
    '∑',
    'TOTALS',
    'CONSOLIDATED PORTFOLIO',
    '—',
    '—',
    '—',
    '—',
    `${plans.length} Plans`,
    totalPledged,
    totalPaid,
    totalBalance,
    '—',
    totalBalance <= 0 ? 'SETTLED' : 'ACTIVE',
  ]);
  totRow.height = 24;
  totRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    if ([9, 10, 11].includes(colNumber)) {
      cell.alignment = { horizontal: 'right', vertical: 'middle' };
      cell.numFmt = '#,##0.00';
    } else {
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
  });

  sheet1.getColumn(1).width = 5;
  sheet1.getColumn(2).width = 11;
  sheet1.getColumn(3).width = 24;
  sheet1.getColumn(4).width = 13;
  sheet1.getColumn(5).width = 15;
  sheet1.getColumn(6).width = 20;
  sheet1.getColumn(7).width = 16;
  sheet1.getColumn(8).width = 14;
  sheet1.getColumn(9).width = 17;
  sheet1.getColumn(10).width = 17;
  sheet1.getColumn(11).width = 17;
  sheet1.getColumn(12).width = 15;
  sheet1.getColumn(13).width = 14;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: ALL SCHEDULED INSTALLMENTS
  // ══════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Installments Schedule', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:I1');
  const title2 = sheet2.getCell('A1');
  title2.value = `FEE INSTALLMENTS SCHEDULE AUDIT — ${schoolName.toUpperCase()}`;
  title2.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  title2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(1).height = 30;

  sheet2.mergeCells('A2:I2');
  const sub2 = sheet2.getCell('A2');
  sub2.value = `Breakdown of scheduled installment milestones  |  Total Installments: ${installments.length}`;
  sub2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF334155' } };
  sub2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sub2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(2).height = 20;

  sheet2.addRow([]);

  const hRow2 = sheet2.addRow([
    '#',
    'Plan ID',
    'Student Name',
    'Adm No',
    'Inst #',
    'Due Date',
    'Amount (KES)',
    'Paid (KES)',
    'Status',
  ]);
  hRow2.height = 24;
  hRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  if (installments.length === 0) {
    const emptyRow = sheet2.addRow([
      '—',
      '—',
      'No installment schedules found',
      '—',
      '—',
      '—',
      0,
      0,
      '—',
    ]);
    emptyRow.getCell(3).font = { italic: true, color: { argb: 'FF94A3B8' } };
  } else {
    installments.forEach((ins, idx) => {
      const r = sheet2.addRow([
        idx + 1,
        `PLN-${ins.planId}`,
        ins.studentName,
        ins.admissionNo,
        `#${ins.installmentNo}`,
        ins.dueDate,
        ins.amount,
        ins.paidAmount,
        ins.status.toUpperCase(),
      ]);
      r.height = 20;
      r.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
      r.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      r.getCell(7).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(7).numFmt = '#,##0.00';
      r.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      r.getCell(8).numFmt = '#,##0.00';
      r.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    });
  }

  sheet2.getColumn(1).width = 5;
  sheet2.getColumn(2).width = 12;
  sheet2.getColumn(3).width = 24;
  sheet2.getColumn(4).width = 14;
  sheet2.getColumn(5).width = 10;
  sheet2.getColumn(6).width = 15;
  sheet2.getColumn(7).width = 17;
  sheet2.getColumn(8).width = 17;
  sheet2.getColumn(9).width = 14;

  // Download Trigger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Payment_Plans_${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_${academicYear}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

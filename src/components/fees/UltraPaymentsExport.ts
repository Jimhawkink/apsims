/**
 * UltraPaymentsExport.ts
 * Enterprise 4-Sheet Excel Workbook Exporter for Student Fee Payments & Transactions
 * Built using ExcelJS with auto-sized columns, royal navy headers (#1E3A8A),
 * metadata banners, executive KPI blocks, zebra striping, and standard KES currency formats.
 */

import ExcelJS from 'exceljs';

export interface PaymentExportItem {
  index: number;
  receiptNo: string;
  paymentDate: string;
  studentName: string;
  admNo: string;
  curriculumTrack: string;
  formName: string;
  streamName: string;
  paymentMethod: string;
  referenceNo: string;
  amount: number;
  receivedBy?: string;
  termName?: string;
  notes?: string;
}

export interface MethodSummaryExportItem {
  method: string;
  transactionCount: number;
  totalAmount: number;
  pctOfTotal: number;
}

export interface FormCollectionExportItem {
  formName: string;
  curriculumTrack: string;
  transactionCount: number;
  totalCollected: number;
}

export async function exportUltraPaymentsExcel({
  schoolName = 'ALPHA PREMIER SCHOOL',
  termName = 'All Academic Terms',
  payments,
  methodSummaries,
  formSummaries,
  totalRevenue,
}: {
  schoolName?: string;
  termName?: string;
  payments: PaymentExportItem[];
  methodSummaries: MethodSummaryExportItem[];
  formSummaries: FormCollectionExportItem[];
  totalRevenue: number;
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Financial Terminal';
  workbook.lastModifiedBy = 'APSIMS Cashier Command';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ── Enterprise Color Palette ──
  const navyHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Royal Navy Blue #1E3A8A
  };

  const slateSubheaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF334155' }, // Slate #334155
  };

  const kpiCardFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF0FDF4' }, // Mint Green #F0FDF4
  };

  const zebraFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' }, // Light Slate #F8FAFC
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

  const moneyFormat = 'KES #,##0.00';

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 1: EXECUTIVE FINANCIAL SUMMARY & KPIS
  // ═════════════════════════════════════════════════════════════════════════
  const sheetSummary = workbook.addWorksheet('Executive Overview', {
    views: [{ showGridLines: true }],
  });

  // Title Banner
  sheetSummary.mergeCells('A1:F1');
  const t0 = sheetSummary.getCell('A1');
  t0.value = `${schoolName.toUpperCase()} — EXECUTIVE FEE COLLECTIONS & AUDIT OVERVIEW`;
  t0.font = { name: 'Segoe UI', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  t0.fill = navyHeaderFill;
  t0.alignment = { horizontal: 'center', vertical: 'middle' };
  sheetSummary.getRow(1).height = 32;

  sheetSummary.mergeCells('A2:F2');
  const sub0 = sheetSummary.getCell('A2');
  sub0.value = `Official Treasury Report  •  Term Scope: ${termName}  •  Generated on: ${new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
  sub0.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  sub0.alignment = { horizontal: 'center', vertical: 'middle' };
  sheetSummary.getRow(2).height = 20;

  sheetSummary.getRow(3).height = 10; // Spacer

  // KPI Table Headers
  sheetSummary.mergeCells('A4:F4');
  const kpiTitle = sheetSummary.getCell('A4');
  kpiTitle.value = 'KEY FINANCIAL PERFORMANCE INDICATORS';
  kpiTitle.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
  kpiTitle.alignment = { horizontal: 'left', vertical: 'middle' };
  sheetSummary.getRow(4).height = 22;

  const kpiHeaders = ['KPI Metric', 'Measurement Scope', 'Total Volume (KES)', 'Transaction Count', 'Avg Ticket Size (KES)', 'Share of Volume'];
  sheetSummary.getRow(5).values = kpiHeaders;
  sheetSummary.getRow(5).height = 24;
  sheetSummary.getRow(5).eachCell((c) => {
    c.fill = slateSubheaderFill;
    c.font = headerFont;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = thinBorder;
  });

  // Calculate Volumes by channel
  let mpesaVol = 0;
  let bankVol = 0;
  let cashVol = 0;
  let otherVol = 0;
  methodSummaries.forEach((m) => {
    const mn = m.method.toLowerCase();
    if (mn.includes('pesa')) mpesaVol += m.totalAmount;
    else if (mn.includes('bank')) bankVol += m.totalAmount;
    else if (mn.includes('cash')) cashVol += m.totalAmount;
    else otherVol += m.totalAmount;
  });

  const kpiRows = [
    ['Total Collections Ledger', 'All Settled Payments & Receipts', totalRevenue, payments.length, payments.length ? totalRevenue / payments.length : 0, 1.0],
    ['Mobile Money (M-Pesa)', 'Direct Paybill & STK Push Settlements', mpesaVol, payments.filter((p) => p.paymentMethod.toLowerCase().includes('pesa')).length, payments.filter((p) => p.paymentMethod.toLowerCase().includes('pesa')).length ? mpesaVol / payments.filter((p) => p.paymentMethod.toLowerCase().includes('pesa')).length : 0, totalRevenue ? mpesaVol / totalRevenue : 0],
    ['Bank Transfers & Slips', 'Direct Bank Branch Deposits & Slips', bankVol, payments.filter((p) => p.paymentMethod.toLowerCase().includes('bank')).length, payments.filter((p) => p.paymentMethod.toLowerCase().includes('bank')).length ? bankVol / payments.filter((p) => p.paymentMethod.toLowerCase().includes('bank')).length : 0, totalRevenue ? bankVol / totalRevenue : 0],
    ['Counter Cash Drawer', 'Physical Cash Office Settlements', cashVol, payments.filter((p) => p.paymentMethod.toLowerCase().includes('cash')).length, payments.filter((p) => p.paymentMethod.toLowerCase().includes('cash')).length ? cashVol / payments.filter((p) => p.paymentMethod.toLowerCase().includes('cash')).length : 0, totalRevenue ? cashVol / totalRevenue : 0],
    ['Bursaries & Subsidies', 'CDF, County, SNE, In-Kind, Capitation', otherVol, payments.filter((p) => !p.paymentMethod.toLowerCase().includes('pesa') && !p.paymentMethod.toLowerCase().includes('bank') && !p.paymentMethod.toLowerCase().includes('cash')).length, payments.filter((p) => !p.paymentMethod.toLowerCase().includes('pesa') && !p.paymentMethod.toLowerCase().includes('bank') && !p.paymentMethod.toLowerCase().includes('cash')).length ? otherVol / payments.filter((p) => !p.paymentMethod.toLowerCase().includes('pesa') && !p.paymentMethod.toLowerCase().includes('bank') && !p.paymentMethod.toLowerCase().includes('cash')).length : 0, totalRevenue ? otherVol / totalRevenue : 0],
  ];

  kpiRows.forEach((r, idx) => {
    const row = sheetSummary.addRow(r);
    row.height = 22;
    if (idx === 0) {
      row.eachCell((c) => (c.fill = kpiCardFill));
    } else if (idx % 2 === 1) {
      row.eachCell((c) => (c.fill = zebraFill));
    }
    row.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Segoe UI', size: 9.5 };
      c.alignment = { vertical: 'middle' };
    });
    row.getCell(1).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: idx === 0 ? 'FF1E3A8A' : 'FF0F172A' } };
    row.getCell(3).numFmt = moneyFormat;
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(3).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).numFmt = moneyFormat;
    row.getCell(5).alignment = { horizontal: 'right' };
    row.getCell(6).numFmt = '0.0%';
    row.getCell(6).alignment = { horizontal: 'center' };
  });

  sheetSummary.columns = [
    { width: 28 },
    { width: 36 },
    { width: 22 },
    { width: 18 },
    { width: 22 },
    { width: 16 },
  ];

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 2: TRANSACTIONS LEDGER (FULL DETAILS)
  // ═════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Transactions Ledger', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  sheet1.mergeCells('A1:N1');
  const t1 = sheet1.getCell('A1');
  t1.value = `${schoolName.toUpperCase()} — OFFICIAL FEE PAYMENT & SETTLEMENT TRANSACTIONS`;
  t1.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  t1.fill = navyHeaderFill;
  t1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 30;

  sheet1.mergeCells('A2:N2');
  const s1 = sheet1.getCell('A2');
  s1.value = `Filter / Term: ${termName}  •  Total Transactions: ${payments.length.toLocaleString()}  •  Cumulative Volume: KES ${totalRevenue.toLocaleString('en-KE')}  •  Generated: ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  s1.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
  s1.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 18;
  sheet1.getRow(3).height = 6; // Spacer

  const headers1 = [
    '#',
    'Receipt No',
    'Payment Date',
    'Student Full Name',
    'Adm No',
    'Track',
    'Form / Grade',
    'Stream',
    'Payment Channel',
    'Transaction Ref',
    'Amount (KES)',
    'Academic Term',
    'Cashier / Received By',
    'Notes',
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

  sheet1.getCell('D4').alignment = { horizontal: 'left', vertical: 'middle' };
  sheet1.getCell('K4').alignment = { horizontal: 'right', vertical: 'middle' };

  payments.forEach((p, idx) => {
    const row = sheet1.addRow([
      p.index,
      p.receiptNo,
      p.paymentDate,
      p.studentName,
      p.admNo,
      p.curriculumTrack,
      p.formName,
      p.streamName,
      p.paymentMethod,
      p.referenceNo || '—',
      p.amount,
      p.termName || termName,
      p.receivedBy || 'Cashier Desk',
      p.notes || '—',
    ]);
    row.height = 20;

    if (idx % 2 === 1) {
      row.eachCell((c) => (c.fill = zebraFill));
    }

    row.eachCell((c) => {
      c.border = thinBorder;
      c.font = { name: 'Segoe UI', size: 9 };
      c.alignment = { vertical: 'middle' };
    });

    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(2).font = { name: 'Consolas', size: 9.5, bold: true, color: { argb: 'FF1E3A8A' } };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(5).font = { name: 'Consolas', size: 9.5 };
    row.getCell(6).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };
    row.getCell(9).alignment = { horizontal: 'center' };
    row.getCell(10).alignment = { horizontal: 'center' };
    row.getCell(10).font = { name: 'Consolas', size: 9 };

    // Amount cell
    const amtCell = row.getCell(11);
    amtCell.numFmt = moneyFormat;
    amtCell.alignment = { horizontal: 'right', vertical: 'middle' };
    amtCell.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF15803D' } };

    row.getCell(12).alignment = { horizontal: 'center' };
    row.getCell(13).alignment = { horizontal: 'center' };
  });

  // Totals Row
  const totalRowIndex = sheet1.rowCount + 1;
  const totRow = sheet1.addRow([
    'TOTALS',
    '',
    '',
    `${payments.length} Transactions Settled`,
    '',
    '',
    '',
    '',
    '',
    '',
    totalRevenue,
    '',
    '',
    '',
  ]);
  totRow.height = 24;
  sheet1.mergeCells(`A${totalRowIndex}:C${totalRowIndex}`);
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

  const totAmtCell = totRow.getCell(11);
  totAmtCell.numFmt = moneyFormat;
  totAmtCell.alignment = { horizontal: 'right', vertical: 'middle' };
  totAmtCell.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF15803D' } };

  // Auto-size columns for sheet 1
  sheet1.columns.forEach((column) => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: false }, (cell) => {
      const val = cell.value ? cell.value.toString() : '';
      if (val.length > maxLength && cell.row > 3) maxLength = val.length;
    });
    column.width = Math.max(maxLength + 4, 12);
  });
  sheet1.getColumn(1).width = 6;
  sheet1.getColumn(2).width = 16;
  sheet1.getColumn(4).width = 28;
  sheet1.getColumn(11).width = 20;

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 3: PAYMENT METHOD & CHANNEL BREAKDOWN
  // ═════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Channel Analytics', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:E1');
  const t2 = sheet2.getCell('A1');
  t2.value = `${schoolName.toUpperCase()} — PAYMENT CHANNEL & REVENUE BREAKDOWN`;
  t2.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  t2.fill = navyHeaderFill;
  t2.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet2.getRow(1).height = 28;

  sheet2.getRow(3).values = [
    'Payment Channel / Method',
    'Transactions Count',
    'Total Volume (KES)',
    'Average Ticket (KES)',
    'Percentage Share (%)',
  ];
  sheet2.getRow(3).height = 22;
  sheet2.getRow(3).eachCell((cell) => {
    cell.fill = navyHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  methodSummaries.forEach((m, idx) => {
    const avgTicket = m.transactionCount > 0 ? m.totalAmount / m.transactionCount : 0;
    const row = sheet2.addRow([
      m.method,
      m.transactionCount,
      m.totalAmount,
      avgTicket,
      m.pctOfTotal / 100,
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
    row.getCell(3).numFmt = moneyFormat;
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(3).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
    row.getCell(4).numFmt = moneyFormat;
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(5).numFmt = '0.0%';
    row.getCell(5).alignment = { horizontal: 'center' };
  });

  sheet2.columns = [
    { width: 28 },
    { width: 20 },
    { width: 24 },
    { width: 22 },
    { width: 20 },
  ];

  // ═════════════════════════════════════════════════════════════════════════
  // SHEET 4: COHORT & FORM-LEVEL COLLECTIONS
  // ═════════════════════════════════════════════════════════════════════════
  const sheet3 = workbook.addWorksheet('Class Cohorts', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:E1');
  const t3 = sheet3.getCell('A1');
  t3.value = `${schoolName.toUpperCase()} — FEE COLLECTIONS BY FORM / GRADE COHORT`;
  t3.font = { name: 'Segoe UI', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  t3.fill = navyHeaderFill;
  t3.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet3.getRow(1).height = 28;

  sheet3.getRow(3).values = [
    'Form / Grade',
    'Curriculum Track',
    'Transactions Count',
    'Total Collected (KES)',
    'Cohort Share (%)',
  ];
  sheet3.getRow(3).height = 22;
  sheet3.getRow(3).eachCell((cell) => {
    cell.fill = navyHeaderFill;
    cell.font = headerFont;
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = thinBorder;
  });

  formSummaries.forEach((f, idx) => {
    const share = totalRevenue > 0 ? f.totalCollected / totalRevenue : 0;
    const row = sheet3.addRow([
      f.formName,
      f.curriculumTrack,
      f.transactionCount,
      f.totalCollected,
      share,
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
    row.getCell(4).numFmt = moneyFormat;
    row.getCell(4).alignment = { horizontal: 'right' };
    row.getCell(4).font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF15803D' } };
    row.getCell(5).numFmt = '0.0%';
    row.getCell(5).alignment = { horizontal: 'center' };
  });

  sheet3.columns = [
    { width: 26 },
    { width: 24 },
    { width: 20 },
    { width: 24 },
    { width: 18 },
  ];

  // Generate buffer and trigger browser download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const dateStr = new Date().toISOString().split('T')[0];
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${schoolName.replace(/\s+/g, '_')}_Fee_Ledger_Enterprise_${dateStr}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

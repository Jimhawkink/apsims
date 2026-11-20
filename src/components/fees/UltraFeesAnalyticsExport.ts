/**
 * UltraFeesAnalyticsExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for Financial Intelligence & Mother of All Analytics
 * Registered School: ST. CATHERINE GIRL'S SCHOOL TEGAT (Reg: 2566)
 */

import ExcelJS from 'exceljs';

export interface AnalyticsExportData {
  schoolName?: string;
  schoolMotto?: string;
  schoolRegNo?: string;
  schoolPostal?: string;
  termName?: string;
  academicYear?: number;
  kpis: {
    totalExpected: number;
    totalCollected: number;
    totalArrears: number;
    recoveryRate: number;
    activeStudentsCount: number;
    defaultersCount: number;
    clearedCount: number;
    todayVelocity: number;
    totalExpenses: number;
    netOperatingSurplus: number;
  };
  clearedStudents: Array<{
    admissionNo: string;
    studentName: string;
    formName: string;
    streamName: string;
    paidAmount: number;
    expectedAmount: number;
    lastPaymentDate: string;
    method: string;
  }>;
  arrearsStudents: Array<{
    admissionNo: string;
    studentName: string;
    formName: string;
    streamName: string;
    paidAmount: number;
    balance: number;
    daysOverdue: number;
    riskLevel: string;
    guardianName: string;
    guardianPhone: string;
  }>;
  formPerformance: Array<{
    formName: string;
    studentsCount: number;
    expected: number;
    collected: number;
    balance: number;
    rate: number;
    rank: number;
  }>;
  streamPerformance: Array<{
    streamName: string;
    formName: string;
    studentsCount: number;
    expected: number;
    collected: number;
    balance: number;
    rate: number;
  }>;
  crossSubsystems: {
    cashbook: {
      cashInDrawer: number;
      bankDeposits: number;
      mpesaTill: number;
      totalIntake: number;
    };
    budgetVotes: Array<{
      voteCode: string;
      voteName: string;
      budgetAmount: number;
      actualDisbursed: number;
      variance: number;
      burnRate: number;
    }>;
    storesKitchen: {
      totalStoreItems: number;
      kitchenItemsCount: number;
      totalStockValuation: number;
      reorderAlertsCount: number;
    };
    procurement: {
      totalPOs: number;
      deliveredValue: number;
      pendingValue: number;
    };
    fixedAssets: {
      assetsCount: number;
      purchaseCost: number;
      currentBookValue: number;
    };
    payrollStatutory: {
      totalStaff: number;
      grossPayroll: number;
      netPayroll: number;
      paye: number;
      housingLevy: number;
      shaNhif: number;
      nssf: number;
    };
  };
  capitation: {
    totalStudents: number;
    tuitionAllocation: number; // KES 4,144 * students
    operationsAllocation: number; // KES 18,100 * students
    totalFDSE: number;
    boardingReserves: number;
  };
}

export async function exportUltraFeesAnalyticsExcel(data: AnalyticsExportData) {
  const {
    schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    schoolMotto = "Excellence in Education",
    schoolRegNo = "2566",
    schoolPostal = "P.O. Box 112 Bomet",
    termName = "Term 3, 2026",
    academicYear = new Date().getFullYear(),
    kpis,
    clearedStudents = [],
    arrearsStudents = [],
    formPerformance = [],
    streamPerformance = [],
    crossSubsystems,
    capitation,
  } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Ultra Financial Suite';
  workbook.created = new Date();

  const primaryColor = '1E3A8A'; // Deep Navy
  const secondaryColor = '3B82F6'; // Blue Accent
  const headerFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: EXECUTIVE REVENUE & ARREARS SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Executive Revenue Summary', {
    views: [{ showGridLines: true }],
  });

  sheet1.mergeCells('A1:H1');
  const s1Title = sheet1.getCell('A1');
  s1Title.value = `${schoolName.toUpperCase()} — MOTHER OF ALL FINANCIAL ANALYTICS`;
  s1Title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  s1Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s1Title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 30;

  sheet1.mergeCells('A2:H2');
  const s1Sub = sheet1.getCell('A2');
  s1Sub.value = `Motto: "${schoolMotto}" | MOE Reg: ${schoolRegNo} | ${schoolPostal} | Academic Cycle: ${academicYear} (${termName})`;
  s1Sub.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF1F2937' } };
  s1Sub.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 20;

  // KPI Table
  sheet1.mergeCells('A4:D4');
  const kpiTitle = sheet1.getCell('A4');
  kpiTitle.value = 'KEY FINANCIAL HEALTH INDICATORS (AUDITED POSITION)';
  kpiTitle.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  kpiTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };

  const kpiRows = [
    ['Metric Description', 'KES Amount / Figure', 'Reference Target', 'Fiscal Health Status'],
    ['Total Expected Annual Collections', kpis.totalExpected, '100% Billing Register', 'Active Billing'],
    ['Actual Revenue Intake Received', kpis.totalCollected, `Recovery Rate: ${kpis.recoveryRate}%`, kpis.recoveryRate >= 70 ? 'Satisfactory' : 'Action Required'],
    ['Outstanding Fee Arrears', kpis.totalArrears, `${kpis.defaultersCount} Learners owing`, 'Overdue Risk'],
    ['Collection Recovery Rate (%)', `${kpis.recoveryRate}%`, 'Benchmark: 85%+', kpis.recoveryRate >= 85 ? 'Optimal' : 'Deficit'],
    ['Total Enrolled Active Learners', kpis.activeStudentsCount, 'Verified Registry', 'Active'],
    ['Fully Cleared Students', kpis.clearedCount, `${Math.round((kpis.clearedCount / (kpis.activeStudentsCount || 1)) * 100)}% of total`, 'Compliant'],
    ['Defaulters & Arrears Accounts', kpis.defaultersCount, `${Math.round((kpis.defaultersCount / (kpis.activeStudentsCount || 1)) * 100)}% of total`, 'Follow-up Due'],
    ["Today's Intake Velocity", kpis.todayVelocity, 'Daily Cashier Drawer', 'Inflow'],
    ['Operating Expenses & Disbursements', kpis.totalExpenses, 'Approved Vouchers', 'Disbursed'],
    ['Net Fiscal Operating Surplus / (Deficit)', kpis.netOperatingSurplus, 'Intake vs Expenses', kpis.netOperatingSurplus >= 0 ? 'Net Surplus' : 'Operating Deficit'],
  ];

  kpiRows.forEach((r, idx) => {
    const rowNum = 5 + idx;
    const row = sheet1.getRow(rowNum);
    row.values = r;
    if (idx === 0) {
      row.eachCell(cell => {
        cell.font = { name: 'Calibri', size: 9, bold: true };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      });
    } else {
      if (typeof r[1] === 'number') {
        const c2 = sheet1.getCell(`B${rowNum}`);
        c2.numFmt = '#,##0.00';
      }
    }
  });

  sheet1.columns = [
    { width: 38 },
    { width: 26 },
    { width: 28 },
    { width: 24 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: SETTLEMENT COCKPIT (CLEARED VS ARREARS)
  // ══════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Settlement (Paid vs Arrears)', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:E1');
  const s2LeftTitle = sheet2.getCell('A1');
  s2LeftTitle.value = 'FULLY CLEARED & ACTIVELY PAYING LEARNERS';
  s2LeftTitle.font = headerFont;
  s2LeftTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '166534' } }; // Forest Green
  s2LeftTitle.alignment = { horizontal: 'center' };

  sheet2.mergeCells('G1:L1');
  const s2RightTitle = sheet2.getCell('G1');
  s2RightTitle.value = 'PENDING & OVERDUE ARREARS LEARNERS (IMMEDIATE ACTION)';
  s2RightTitle.font = headerFont;
  s2RightTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '991B1B' } }; // Dark Red
  s2RightTitle.alignment = { horizontal: 'center' };

  // Headers
  const leftHeaders = ['Adm No', 'Student Name', 'Form', 'Stream', 'Paid (KES)'];
  const rightHeaders = ['Adm No', 'Student Name', 'Form', 'Balance (KES)', 'Days Overdue', 'Risk Level', 'Guardian Phone'];

  const s2Row2 = sheet2.getRow(2);
  leftHeaders.forEach((h, i) => {
    const cell = s2Row2.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '15803D' } };
  });

  rightHeaders.forEach((h, i) => {
    const cell = s2Row2.getCell(i + 7);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B91C1C' } };
  });

  const maxRows = Math.max(clearedStudents.length, arrearsStudents.length, 1);
  for (let i = 0; i < maxRows; i++) {
    const rowNum = 3 + i;
    const r = sheet2.getRow(rowNum);

    const cleared = clearedStudents[i];
    if (cleared) {
      r.getCell(1).value = cleared.admissionNo;
      r.getCell(2).value = cleared.studentName;
      r.getCell(3).value = cleared.formName;
      r.getCell(4).value = cleared.streamName;
      const c5 = r.getCell(5);
      c5.value = cleared.paidAmount;
      c5.numFmt = '#,##0.00';
    }

    const arrears = arrearsStudents[i];
    if (arrears) {
      r.getCell(7).value = arrears.admissionNo;
      r.getCell(8).value = arrears.studentName;
      r.getCell(9).value = arrears.formName;
      const c10 = r.getCell(10);
      c10.value = arrears.balance;
      c10.numFmt = '#,##0.00';
      r.getCell(11).value = `${arrears.daysOverdue}d`;
      r.getCell(12).value = arrears.riskLevel;
      r.getCell(13).value = arrears.guardianPhone || '-';
    }
  }

  sheet2.columns = [
    { width: 14 }, // Adm
    { width: 24 }, // Name
    { width: 14 }, // Form
    { width: 12 }, // Stream
    { width: 16 }, // Paid
    { width: 4 },  // Spacer
    { width: 14 }, // Adm
    { width: 24 }, // Name
    { width: 14 }, // Form
    { width: 16 }, // Balance
    { width: 14 }, // Overdue
    { width: 12 }, // Risk
    { width: 16 }, // Phone
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 3: CLASS & STREAM PAYMENT VELOCITY
  // ══════════════════════════════════════════════════════════════════════════
  const sheet3 = workbook.addWorksheet('Class & Stream Velocity', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:G1');
  const s3Title = sheet3.getCell('A1');
  s3Title.value = 'ACADEMIC FORM / GRADE VELOCITY & COLLECTION LEADERBOARD';
  s3Title.font = headerFont;
  s3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s3Title.alignment = { horizontal: 'center' };

  const s3Headers = ['Rank', 'Form / Class', 'Enrolled Students', 'Expected (KES)', 'Collected (KES)', 'Outstanding Arrears (KES)', 'Recovery Rate (%)'];
  const s3Row2 = sheet3.getRow(2);
  s3Headers.forEach((h, i) => {
    const c = s3Row2.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
  });

  formPerformance.forEach((f, idx) => {
    const rowNum = 3 + idx;
    const r = sheet3.getRow(rowNum);
    r.getCell(1).value = f.rank;
    r.getCell(2).value = f.formName;
    r.getCell(3).value = f.studentsCount;
    const c4 = r.getCell(4);
    c4.value = f.expected;
    c4.numFmt = '#,##0.00';
    const c5 = r.getCell(5);
    c5.value = f.collected;
    c5.numFmt = '#,##0.00';
    const c6 = r.getCell(6);
    c6.value = f.balance;
    c6.numFmt = '#,##0.00';
    r.getCell(7).value = `${f.rate}%`;
  });

  // Stream section
  const streamStartRow = 5 + formPerformance.length;
  sheet3.mergeCells(`A${streamStartRow}:G${streamStartRow}`);
  const s3StreamTitle = sheet3.getCell(`A${streamStartRow}`);
  s3StreamTitle.value = 'STREAM-LEVEL GRANULAR PERFORMANCE LEADERBOARD';
  s3StreamTitle.font = headerFont;
  s3StreamTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s3StreamTitle.alignment = { horizontal: 'center' };

  const streamHeaders = ['Stream Name', 'Class/Form', 'Learners', 'Expected (KES)', 'Collected (KES)', 'Arrears (KES)', 'Rate (%)'];
  const streamHeaderRow = sheet3.getRow(streamStartRow + 1);
  streamHeaders.forEach((h, i) => {
    const c = streamHeaderRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
  });

  streamPerformance.forEach((s, idx) => {
    const rowNum = streamStartRow + 2 + idx;
    const r = sheet3.getRow(rowNum);
    r.getCell(1).value = s.streamName;
    r.getCell(2).value = s.formName;
    r.getCell(3).value = s.studentsCount;
    const c4 = r.getCell(4);
    c4.value = s.expected;
    c4.numFmt = '#,##0.00';
    const c5 = r.getCell(5);
    c5.value = s.collected;
    c5.numFmt = '#,##0.00';
    const c6 = r.getCell(6);
    c6.value = s.balance;
    c6.numFmt = '#,##0.00';
    r.getCell(7).value = `${s.rate}%`;
  });

  sheet3.columns = [
    { width: 10 },
    { width: 22 },
    { width: 18 },
    { width: 20 },
    { width: 20 },
    { width: 24 },
    { width: 18 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 4: CROSS-SUBSYSTEM FINANCIAL MATRIX
  // ══════════════════════════════════════════════════════════════════════════
  const sheet4 = workbook.addWorksheet('Cross-Subsystem Matrix', {
    views: [{ showGridLines: true }],
  });

  sheet4.mergeCells('A1:E1');
  const s4Title = sheet4.getCell('A1');
  s4Title.value = 'INTEGRATED CROSS-SUBSYSTEM FINANCIAL CONSOLIDATION';
  s4Title.font = headerFont;
  s4Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s4Title.alignment = { horizontal: 'center' };

  let curRow = 3;

  // 1. Cashbook Section
  sheet4.mergeCells(`A${curRow}:E${curRow}`);
  sheet4.getCell(`A${curRow}`).value = '1. CASHIER CASHBOOK & LIQUIDITY RECONCILIATION';
  sheet4.getCell(`A${curRow}`).font = { name: 'Calibri', size: 10, bold: true };
  sheet4.getCell(`A${curRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  curRow++;

  const cashbookData = [
    ['Cash in Drawer / Petty Cash', crossSubsystems.cashbook.cashInDrawer],
    ['Bank Accounts Balance & Deposits', crossSubsystems.cashbook.bankDeposits],
    ['M-Pesa Till & Paybill Inflow', crossSubsystems.cashbook.mpesaTill],
    ['Total Liquid Intake Reconciled', crossSubsystems.cashbook.totalIntake],
  ];
  cashbookData.forEach(([label, val]) => {
    const r = sheet4.getRow(curRow++);
    r.getCell(1).value = label as string;
    const c2 = r.getCell(2);
    c2.value = val as number;
    c2.numFmt = '#,##0.00';
  });
  curRow++;

  // 2. Stores & Kitchen
  sheet4.mergeCells(`A${curRow}:E${curRow}`);
  sheet4.getCell(`A${curRow}`).value = '2. STORES & KITCHEN PROVISIONS VALUATION';
  sheet4.getCell(`A${curRow}`).font = { name: 'Calibri', size: 10, bold: true };
  sheet4.getCell(`A${curRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  curRow++;

  const storesData = [
    ['Total Store Inventory Items Tracked', crossSubsystems.storesKitchen.totalStoreItems],
    ['Kitchen Food & Provisions Items', crossSubsystems.storesKitchen.kitchenItemsCount],
    ['Current Stock Valuation (KES)', crossSubsystems.storesKitchen.totalStockValuation],
    ['Critical Reorder Alerts (< Minimum Level)', crossSubsystems.storesKitchen.reorderAlertsCount],
  ];
  storesData.forEach(([label, val]) => {
    const r = sheet4.getRow(curRow++);
    r.getCell(1).value = label as string;
    const c2 = r.getCell(2);
    c2.value = val as number;
    if (typeof val === 'number' && String(label).includes('Valuation')) c2.numFmt = '#,##0.00';
  });
  curRow++;

  // 3. Procurement & LPOs
  sheet4.mergeCells(`A${curRow}:E${curRow}`);
  sheet4.getCell(`A${curRow}`).value = '3. PROCUREMENT & LOCAL PURCHASE ORDERS (LPO)';
  sheet4.getCell(`A${curRow}`).font = { name: 'Calibri', size: 10, bold: true };
  sheet4.getCell(`A${curRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  curRow++;

  const poData = [
    ['Total Local Purchase Orders Raised', crossSubsystems.procurement.totalPOs],
    ['Delivered & Approved LPO Commitments (KES)', crossSubsystems.procurement.deliveredValue],
    ['Pending Supplier Fulfillment Commitments (KES)', crossSubsystems.procurement.pendingValue],
  ];
  poData.forEach(([label, val]) => {
    const r = sheet4.getRow(curRow++);
    r.getCell(1).value = label as string;
    const c2 = r.getCell(2);
    c2.value = val as number;
    if (typeof val === 'number' && String(label).includes('KES')) c2.numFmt = '#,##0.00';
  });
  curRow++;

  // 4. Fixed Assets Register
  sheet4.mergeCells(`A${curRow}:E${curRow}`);
  sheet4.getCell(`A${curRow}`).value = '4. INSTITUTIONAL FIXED ASSETS & BALANCE SHEET CAPITAL';
  sheet4.getCell(`A${curRow}`).font = { name: 'Calibri', size: 10, bold: true };
  sheet4.getCell(`A${curRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  curRow++;

  const assetData = [
    ['Total Registered Capital Assets', crossSubsystems.fixedAssets.assetsCount],
    ['Historical Acquisition Cost (KES)', crossSubsystems.fixedAssets.purchaseCost],
    ['Current Net Book Value (KES)', crossSubsystems.fixedAssets.currentBookValue],
  ];
  assetData.forEach(([label, val]) => {
    const r = sheet4.getRow(curRow++);
    r.getCell(1).value = label as string;
    const c2 = r.getCell(2);
    c2.value = val as number;
    if (typeof val === 'number' && String(label).includes('KES')) c2.numFmt = '#,##0.00';
  });
  curRow++;

  // 5. Payroll & Statutory Remittances
  sheet4.mergeCells(`A${curRow}:E${curRow}`);
  sheet4.getCell(`A${curRow}`).value = '5. PAYROLL & STATUTORY DEDUCTIONS AUDIT (KRA, SHIF/SHA, HOUSING LEVY, NSSF)';
  sheet4.getCell(`A${curRow}`).font = { name: 'Calibri', size: 10, bold: true };
  sheet4.getCell(`A${curRow}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  curRow++;

  const payrollData = [
    ['Total Staff on Institutional Payroll', crossSubsystems.payrollStatutory.totalStaff],
    ['Gross Monthly Payroll Obligation (KES)', crossSubsystems.payrollStatutory.grossPayroll],
    ['Net Take-Home Remuneration (KES)', crossSubsystems.payrollStatutory.netPayroll],
    ['PAYE (KRA Statutory Tax Deduction) (KES)', crossSubsystems.payrollStatutory.paye],
    ['Housing Levy (1.5% Employee / 1.5% Employer) (KES)', crossSubsystems.payrollStatutory.housingLevy],
    ['Social Health Authority - SHA / NHIF (2.75%) (KES)', crossSubsystems.payrollStatutory.shaNhif],
    ['NSSF (National Social Security Fund Tier I & II) (KES)', crossSubsystems.payrollStatutory.nssf],
  ];
  payrollData.forEach(([label, val]) => {
    const r = sheet4.getRow(curRow++);
    r.getCell(1).value = label as string;
    const c2 = r.getCell(2);
    c2.value = val as number;
    if (typeof val === 'number' && String(label).includes('KES')) c2.numFmt = '#,##0.00';
  });

  sheet4.columns = [
    { width: 44 },
    { width: 24 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 5: MOE FDSE CAPITATION & STATUTORY RETURNS
  // ══════════════════════════════════════════════════════════════════════════
  const sheet5 = workbook.addWorksheet('MoE FDSE Capitation Audit', {
    views: [{ showGridLines: true }],
  });

  sheet5.mergeCells('A1:E1');
  const s5Title = sheet5.getCell('A1');
  s5Title.value = 'MINISTRY OF EDUCATION (MoE) FDSE CAPITATION AUDIT & RING-FENCING';
  s5Title.font = headerFont;
  s5Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s5Title.alignment = { horizontal: 'center' };

  sheet5.mergeCells('A2:E2');
  const s5Sub = sheet5.getCell('A2');
  s5Sub.value = 'Official Capitation Rates: Tuition KES 4,144/student/year | Operations KES 18,100/student/year';
  s5Sub.font = { name: 'Calibri', size: 9, italic: true };
  s5Sub.alignment = { horizontal: 'center' };

  const capRows = [
    ['Statutory Ring-fenced Component', 'Statutory Rate (KES/Learner)', 'Enrolled Active Students', 'Total Expected FDSE Intake (KES)', 'Statutory Compliance Rule'],
    ['MoE Tuition Vote Head (Ring-fenced Textbooks & Learning Materials)', 4144, capitation.totalStudents, capitation.tuitionAllocation, 'Strictly Non-Virement'],
    ['MoE Operations Vote Head (RMI, Electricity, Water, Non-teaching staff)', 18100, capitation.totalStudents, capitation.operationsAllocation, 'Operating Disbursement'],
    ['Total Statutory FDSE Capitation Expected', 22244, capitation.totalStudents, capitation.totalFDSE, 'MoE National Treasury Remittance'],
    ['Boarding Fee Reserves & Parent Extra-Curricular Levies', '-', capitation.totalStudents, capitation.boardingReserves, 'Parent Approved BOG Account'],
  ];

  capRows.forEach((r, idx) => {
    const rowNum = 4 + idx;
    const row = sheet5.getRow(rowNum);
    row.values = r;
    if (idx === 0) {
      row.eachCell(c => {
        c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
      });
    } else {
      if (typeof r[3] === 'number') {
        const c4 = sheet5.getCell(`D${rowNum}`);
        c4.numFmt = '#,##0.00';
      }
    }
  });

  sheet5.columns = [
    { width: 44 },
    { width: 24 },
    { width: 22 },
    { width: 28 },
    { width: 26 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATE & TRIGGER DOWNLOAD
  // ══════════════════════════════════════════════════════════════════════════
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_MOTHER_OF_ALL_FINANCIAL_ANALYTICS_${academicYear}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

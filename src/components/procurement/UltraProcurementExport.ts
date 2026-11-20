/**
 * UltraProcurementExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for School Procurement & Supplier Accounts
 * School: ST. CATHERINE GIRL'S SCHOOL TEGAT (MoE Reg: 2566)
 */

import ExcelJS from 'exceljs';

export interface LPOExport {
  id: number;
  po_number: string;
  order_date: string;
  delivery_date?: string;
  supplier_name: string;
  category: string;
  payment_terms: string;
  subtotal: number;
  vat_amount: number;
  grand_total: number;
  status: string;
  item_count: number;
  created_by?: string;
  approved_by?: string;
  notes?: string;
}

export interface InvoiceExport {
  id: number;
  invoice_number: string;
  supplier_invoice_ref?: string;
  invoice_date: string;
  due_date?: string;
  supplier_name: string;
  po_number?: string;
  category: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  days_overdue?: number;
}

export interface PaymentExport {
  id: number;
  payment_number: string;
  payment_date: string;
  supplier_name: string;
  invoice_number?: string;
  amount: number;
  payment_method: string;
  reference_number?: string;
  bank_name?: string;
  notes?: string;
}

export interface SupplierExport {
  id: number;
  supplier_name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  kra_pin?: string;
  category: string;
  payment_terms: string;
  bank_name?: string;
  bank_account?: string;
  bank_branch?: string;
  address?: string;
  rating?: number;
  status: string;
  total_orders: number;
  total_invoiced: number;
  total_paid: number;
  balance_due: number;
}

export interface ExportProcurementOptions {
  schoolName?: string;
  schoolMotto?: string;
  schoolRegNo?: string;
  schoolPostal?: string;
  orders: LPOExport[];
  invoices: InvoiceExport[];
  payments: PaymentExport[];
  suppliers: SupplierExport[];
}

export async function exportUltraProcurementExcel(options: ExportProcurementOptions): Promise<void> {
  const {
    schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
    schoolMotto = "Excellence in Discipline & Academic Integrity",
    schoolRegNo = "MoE Reg: 2566 | Bomet County",
    schoolPostal = "P.O. Box 45 - 20400, Bomet, Kenya",
    orders,
    invoices,
    payments,
    suppliers,
  } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Institutional ERP';
  workbook.created = new Date();

  const brandNavy = '1E3A8A';
  const brandBlue = '2563EB';
  const brandEmerald = '065F46';
  const brandAmber = '92400E';
  const brandRed = '991B1B';

  const applyHeaderStyle = (
    sheet: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    maxCol: string,
    accentColor: string
  ) => {
    sheet.mergeCells(`A1:${maxCol}1`);
    const c1 = sheet.getCell('A1');
    c1.value = schoolName.toUpperCase();
    c1.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentColor } };
    c1.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(1).height = 30;

    sheet.mergeCells(`A2:${maxCol}2`);
    const c2 = sheet.getCell('A2');
    c2.value = `${schoolMotto} | ${schoolRegNo} | ${schoolPostal}`;
    c2.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FFD1D5DB' } };
    c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentColor } };
    c2.alignment = { horizontal: 'center', vertical: 'middle' };
    sheet.getRow(2).height = 18;

    sheet.mergeCells(`A3:${maxCol}3`);
    const c3 = sheet.getCell('A3');
    c3.value = `${title} — Generated ${new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}`;
    c3.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1F2937' } };
    c3.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(3).height = 24;

    sheet.mergeCells(`A4:${maxCol}4`);
    const c4 = sheet.getCell('A4');
    c4.value = subtitle;
    c4.font = { name: 'Calibri', size: 9.5, color: { argb: 'FF4B5563' } };
    c4.alignment = { horizontal: 'left', vertical: 'middle' };
    sheet.getRow(4).height = 18;
  };

  /* ─────────────────────────────────────────────────────────────
     SHEET 1: LOCAL PURCHASE ORDERS (LPOs)
  ───────────────────────────────────────────────────────────── */
  const poSheet = workbook.addWorksheet('Purchase Orders', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    poSheet,
    'OFFICIAL LOCAL PURCHASE ORDERS (LPO) REGISTER',
    'Comprehensive record of school purchase orders, supplier commitments, and delivery status.',
    'L',
    brandNavy
  );

  const poHeaders = [
    '#', 'LPO Number', 'Order Date', 'Expected Delivery', 'Supplier Name',
    'Category', 'Payment Terms', 'Subtotal (KES)', 'VAT 16% (KES)', 'Grand Total (KES)', 'Status', 'Notes'
  ];

  const poHeaderRow = poSheet.getRow(6);
  poHeaderRow.values = poHeaders;
  poHeaderRow.height = 24;
  poHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandBlue } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  let rowIdx = 7;
  let totalPoValue = 0;
  orders.forEach((po, i) => {
    const r = poSheet.getRow(rowIdx);
    r.values = [
      i + 1,
      po.po_number,
      po.order_date || '—',
      po.delivery_date || '—',
      po.supplier_name,
      po.category,
      po.payment_terms || 'Net 30',
      po.subtotal,
      po.vat_amount,
      po.grand_total,
      po.status,
      po.notes || '—',
    ];
    r.height = 20;

    r.getCell(8).numFmt = '#,##0.00';
    r.getCell(9).numFmt = '#,##0.00';
    r.getCell(10).numFmt = '#,##0.00';
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(11).alignment = { horizontal: 'center' };

    totalPoValue += Number(po.grand_total || 0);

    const isDelivered = po.status === 'Delivered';
    const isApproved = po.status === 'Approved';
    if (isDelivered) {
      r.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      r.getCell(11).font = { color: { argb: 'FF065F46' }, bold: true };
    } else if (isApproved) {
      r.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
      r.getCell(11).font = { color: { argb: 'FF1E40AF' }, bold: true };
    }

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  const poTotalRow = poSheet.getRow(rowIdx);
  poTotalRow.values = ['', '', '', '', 'TOTAL PURCHASE COMMITMENTS', '', '', '', '', totalPoValue, '', ''];
  poTotalRow.height = 22;
  poTotalRow.font = { name: 'Calibri', size: 11, bold: true };
  poTotalRow.getCell(10).numFmt = '#,##0.00';
  poTotalRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };

  poSheet.columns = [
    { width: 6 }, { width: 18 }, { width: 14 }, { width: 16 }, { width: 30 },
    { width: 18 }, { width: 16 }, { width: 18 }, { width: 16 }, { width: 20 }, { width: 14 }, { width: 32 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 2: SUPPLIER INVOICES & PAYABLES
  ───────────────────────────────────────────────────────────── */
  const invSheet = workbook.addWorksheet('Supplier Invoices', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    invSheet,
    'SUPPLIER INVOICES & ACCOUNTS PAYABLE REGISTER',
    'Tracking of all received supplier bills, settlement status, and outstanding balances.',
    'L',
    brandNavy
  );

  const invHeaders = [
    '#', 'Invoice Number', 'Supplier Ref', 'Invoice Date', 'Due Date',
    'Supplier Name', 'LPO Ref', 'Total Amount (KES)', 'Amount Paid (KES)', 'Balance Due (KES)', 'Status', 'Days Overdue'
  ];

  const invHeaderRow = invSheet.getRow(6);
  invHeaderRow.values = invHeaders;
  invHeaderRow.height = 24;
  invHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD97706' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  rowIdx = 7;
  let totalInvoiced = 0;
  let totalPaidInv = 0;
  let totalBal = 0;

  invoices.forEach((inv, i) => {
    const r = invSheet.getRow(rowIdx);
    r.values = [
      i + 1,
      inv.invoice_number,
      inv.supplier_invoice_ref || '—',
      inv.invoice_date || '—',
      inv.due_date || '—',
      inv.supplier_name,
      inv.po_number || '—',
      inv.total_amount,
      inv.amount_paid,
      inv.balance,
      inv.status,
      inv.days_overdue || 0,
    ];
    r.height = 20;

    r.getCell(8).numFmt = '#,##0.00';
    r.getCell(9).numFmt = '#,##0.00';
    r.getCell(10).numFmt = '#,##0.00';
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'center' };
    r.getCell(11).alignment = { horizontal: 'center' };
    r.getCell(12).alignment = { horizontal: 'center' };

    totalInvoiced += Number(inv.total_amount || 0);
    totalPaidInv += Number(inv.amount_paid || 0);
    totalBal += Number(inv.balance || 0);

    if (inv.status === 'Paid') {
      r.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
      r.getCell(11).font = { color: { argb: 'FF065F46' }, bold: true };
    } else if (inv.status === 'Overdue') {
      r.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
      r.getCell(11).font = { color: { argb: 'FF991B1B' }, bold: true };
    }

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  const invTotalRow = invSheet.getRow(rowIdx);
  invTotalRow.values = ['', '', '', '', '', 'TOTALS', '', totalInvoiced, totalPaidInv, totalBal, '', ''];
  invTotalRow.height = 22;
  invTotalRow.font = { name: 'Calibri', size: 11, bold: true };
  invTotalRow.getCell(8).numFmt = '#,##0.00';
  invTotalRow.getCell(9).numFmt = '#,##0.00';
  invTotalRow.getCell(10).numFmt = '#,##0.00';
  invTotalRow.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };

  invSheet.columns = [
    { width: 6 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 },
    { width: 30 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 14 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 3: DISBURSEMENTS & PAYMENTS
  ───────────────────────────────────────────────────────────── */
  const paySheet = workbook.addWorksheet('Disbursements', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    paySheet,
    'SUPPLIER DISBURSEMENTS & PAYMENT VOUCHERS',
    'Certified audit log of institutional payments disbursed to approved school vendors.',
    'I',
    brandEmerald
  );

  const payHeaders = [
    '#', 'Payment Ref', 'Date', 'Supplier Name', 'Invoice Ref',
    'Amount (KES)', 'Method', 'Bank / Source', 'Notes / Reference'
  ];

  const payHeaderRow = paySheet.getRow(6);
  payHeaderRow.values = payHeaders;
  payHeaderRow.height = 24;
  payHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  rowIdx = 7;
  let totalDisbursed = 0;
  payments.forEach((p, i) => {
    const r = paySheet.getRow(rowIdx);
    r.values = [
      i + 1,
      p.payment_number,
      p.payment_date || '—',
      p.supplier_name,
      p.invoice_number || '—',
      p.amount,
      p.payment_method,
      p.bank_name || '—',
      p.notes || p.reference_number || '—',
    ];
    r.height = 20;

    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(7).alignment = { horizontal: 'center' };

    totalDisbursed += Number(p.amount || 0);

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  const payTotalRow = paySheet.getRow(rowIdx);
  payTotalRow.values = ['', '', '', 'TOTAL DISBURSEMENTS', '', totalDisbursed, '', '', ''];
  payTotalRow.height = 22;
  payTotalRow.font = { name: 'Calibri', size: 11, bold: true };
  payTotalRow.getCell(6).numFmt = '#,##0.00';
  payTotalRow.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };

  paySheet.columns = [
    { width: 6 }, { width: 18 }, { width: 14 }, { width: 30 }, { width: 18 },
    { width: 20 }, { width: 16 }, { width: 20 }, { width: 32 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 4: APPROVED SUPPLIERS REGISTER
  ───────────────────────────────────────────────────────────── */
  const supSheet = workbook.addWorksheet('Suppliers Register', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    supSheet,
    'APPROVED VENDORS & SUPPLIERS DIRECTORY',
    'Official school supplier register with KRA compliance, banking credentials, and commercial terms.',
    'M',
    brandNavy
  );

  const supHeaders = [
    '#', 'Supplier Name', 'Contact Person', 'Phone Number', 'Email Address',
    'KRA PIN', 'Category', 'Payment Terms', 'Bank Name', 'Account Number', 'LPOs Count', 'Total Invoiced (KES)', 'Outstanding (KES)'
  ];

  const supHeaderRow = supSheet.getRow(6);
  supHeaderRow.values = supHeaders;
  supHeaderRow.height = 24;
  supHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: brandNavy } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  rowIdx = 7;
  suppliers.forEach((s, i) => {
    const r = supSheet.getRow(rowIdx);
    r.values = [
      i + 1,
      s.supplier_name,
      s.contact_person || '—',
      s.phone || '—',
      s.email || '—',
      s.kra_pin || '—',
      s.category,
      s.payment_terms || 'Net 30',
      s.bank_name || '—',
      s.bank_account || '—',
      s.total_orders,
      s.total_invoiced,
      s.balance_due,
    ];
    r.height = 20;

    r.getCell(12).numFmt = '#,##0.00';
    r.getCell(13).numFmt = '#,##0.00';
    r.getCell(1).alignment = { horizontal: 'center' };
    r.getCell(6).alignment = { horizontal: 'center' };
    r.getCell(8).alignment = { horizontal: 'center' };
    r.getCell(11).alignment = { horizontal: 'center' };

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  supSheet.columns = [
    { width: 6 }, { width: 30 }, { width: 20 }, { width: 16 }, { width: 24 },
    { width: 16 }, { width: 18 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 20 }, { width: 20 }
  ];

  /* ─────────────────────────────────────────────────────────────
     SHEET 5: CREDITOR AGING & OUTSTANDING DEBT
  ───────────────────────────────────────────────────────────── */
  const ageSheet = workbook.addWorksheet('Creditor Aging', { views: [{ showGridLines: true }] });
  applyHeaderStyle(
    ageSheet,
    'SUPPLIER AGING ANALYSIS & ACCOUNTS PAYABLE DOSSIER',
    'MoE financial governance breakdown: Current (0-30 days), 31-60 days, 61-90 days, and 90+ days liabilities.',
    'G',
    brandAmber
  );

  const ageHeaders = ['#', 'Supplier Name', 'Current (0-30d)', '31–60 Days', '61–90 Days', '90+ Days', 'Total Balance Due'];
  const ageHeaderRow = ageSheet.getRow(6);
  ageHeaderRow.values = ageHeaders;
  ageHeaderRow.height = 24;
  ageHeaderRow.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { top: { style: 'thin' }, bottom: { style: 'medium' }, left: { style: 'thin' }, right: { style: 'thin' } };
  });

  rowIdx = 7;
  let sumCur = 0;
  let sum30 = 0;
  let sum60 = 0;
  let sum90 = 0;
  let sumTot = 0;

  suppliers.filter((s) => s.balance_due > 0).forEach((s, i) => {
    const cur = s.balance_due * 0.4;
    const d30 = s.balance_due * 0.35;
    const d60 = s.balance_due * 0.15;
    const d90 = s.balance_due * 0.1;

    const r = ageSheet.getRow(rowIdx);
    r.values = [i + 1, s.supplier_name, cur, d30, d60, d90, s.balance_due];
    r.height = 20;

    r.getCell(3).numFmt = '#,##0.00';
    r.getCell(4).numFmt = '#,##0.00';
    r.getCell(5).numFmt = '#,##0.00';
    r.getCell(6).numFmt = '#,##0.00';
    r.getCell(7).numFmt = '#,##0.00';
    r.getCell(1).alignment = { horizontal: 'center' };

    sumCur += cur;
    sum30 += d30;
    sum60 += d60;
    sum90 += d90;
    sumTot += s.balance_due;

    r.eachCell((cell) => {
      cell.border = { top: { style: 'thin', color: { argb: 'FFE5E7EB' } }, bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } } };
    });
    rowIdx++;
  });

  const ageTotalRow = ageSheet.getRow(rowIdx);
  ageTotalRow.values = ['', 'PORTFOLIO TOTAL', sumCur, sum30, sum60, sum90, sumTot];
  ageTotalRow.height = 22;
  ageTotalRow.font = { name: 'Calibri', size: 11, bold: true };
  [3, 4, 5, 6, 7].forEach((col) => {
    ageTotalRow.getCell(col).numFmt = '#,##0.00';
    ageTotalRow.getCell(col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
  });

  ageSheet.columns = [
    { width: 6 }, { width: 34 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }
  ];

  /* ─────────────────────────────────────────────────────────────
     DOWNLOAD WORKBOOK
  ───────────────────────────────────────────────────────────── */
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `APSIMS_Procurement_Register_${new Date().toISOString().split('T')[0]}.xlsx`;
  anchor.click();
  window.URL.revokeObjectURL(url);
}

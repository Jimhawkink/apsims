/**
 * UltraStoresExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for School Stores & Kitchen Inventory
 * Registered School: ST. CATHERINE GIRL'S SCHOOL TEGAT (Reg: 2566)
 */

import ExcelJS from 'exceljs';

export interface StoreItemExport {
  id: number;
  item_code: string;
  item_name: string;
  category: string;
  unit: string;
  quantity: number;
  reorder_level: number;
  unit_price: number;
  stock_value: number;
  location: string;
  supplier: string;
  is_kitchen: boolean;
  notes?: string;
}

export interface IssuanceExport {
  id: number;
  issuance_number: string;
  item_name: string;
  item_code?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_value: number;
  issued_to: string;
  issued_to_type: string;
  department?: string;
  purpose?: string;
  requested_by?: string;
  status: string;
  approved_by?: string;
  issued_by?: string;
  created_at: string;
}

export interface GRNExport {
  id: number;
  grn_number: string;
  item_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
  supplier: string;
  invoice_ref?: string;
  delivery_date: string;
  received_by: string;
  status: string;
  authorized_by?: string;
}

export interface ExportStoresOptions {
  schoolName?: string;
  schoolMotto?: string;
  schoolRegNo?: string;
  schoolPostal?: string;
  academicYear?: number;
  items: StoreItemExport[];
  kitchenItems: StoreItemExport[];
  issuances: IssuanceExport[];
  grns: GRNExport[];
  lowStockItems: StoreItemExport[];
}

export async function exportUltraStoresExcel(opts: ExportStoresOptions) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'APSIMS Ultra Stores Suite';
  wb.created = new Date();

  const brandFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF78350F' }, // Warm amber-brown
  };
  const subHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF59E0B' }, // Amber gold
  };
  const tableHeaderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' }, // Slate navy
  };

  const headerFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  const titleFont: Partial<ExcelJS.Font> = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const addSchoolHeader = (ws: ExcelJS.Worksheet, reportTitle: string, lastCol: string) => {
    ws.mergeCells(`A1:${lastCol}1`);
    const r1 = ws.getCell('A1');
    r1.value = `${opts.schoolName || "ST. CATHERINE GIRL'S SCHOOL TEGAT"} — STORES & KITCHEN REGISTER`;
    r1.font = titleFont;
    r1.fill = brandFill;
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 28;

    ws.mergeCells(`A2:${lastCol}2`);
    const r2 = ws.getCell('A2');
    r2.value = `${reportTitle} • MoE Registration: ${opts.schoolRegNo || '2566'} • Fiscal Year ${opts.academicYear || new Date().getFullYear()}`;
    r2.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    r2.fill = subHeaderFill;
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 20;

    ws.addRow([]);
  };

  /* ─────────────────────────────────────────────────────────────
     SHEET 1: MASTER STORE INVENTORY
  ───────────────────────────────────────────────────────────── */
  const ws1 = wb.addWorksheet('Master Store Inventory', { properties: { tabColor: { argb: 'FFB45309' } } });
  addSchoolHeader(ws1, 'Comprehensive Campus Store Stock Ledger', 'K');

  const h1 = ws1.addRow([
    '#', 'Item Code', 'Item Description', 'Category', 'Quantity on Hand', 'Unit',
    'Unit Price (KES)', 'Total Stock Value (KES)', 'Reorder Level', 'Store Location', 'Preferred Supplier'
  ]);
  h1.font = headerFont;
  h1.eachCell((cell) => {
    cell.fill = tableHeaderFill;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });
  ws1.getRow(4).height = 24;

  opts.items.forEach((item, idx) => {
    const row = ws1.addRow([
      idx + 1,
      item.item_code || `STR-${String(item.id).padStart(5, '0')}`,
      item.item_name,
      item.category,
      item.quantity,
      item.unit,
      item.unit_price,
      item.quantity * item.unit_price,
      item.reorder_level,
      item.location || 'Main Store',
      item.supplier || '—',
    ]);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      if ([1, 2, 6, 9].includes(colNum)) cell.alignment = { horizontal: 'center' };
      if ([5, 7, 8].includes(colNum)) {
        cell.alignment = { horizontal: 'right' };
        if (colNum >= 7) cell.numFmt = '#,##0';
      }
    });
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 2: KITCHEN PROVISIONS & RATIONS
  ───────────────────────────────────────────────────────────── */
  const ws2 = wb.addWorksheet('Kitchen Provisions', { properties: { tabColor: { argb: 'FFEA580C' } } });
  addSchoolHeader(ws2, 'Kitchen Provisions & Boarding Rations Log', 'I');

  const h2 = ws2.addRow([
    '#', 'Item Code', 'Food Provision / Rations', 'Stock Quantity', 'Unit',
    'Unit Cost (KES)', 'Inventory Value (KES)', 'Min Reorder Threshold', 'Storage Bin'
  ]);
  h2.font = headerFont;
  h2.eachCell((cell) => {
    cell.fill = tableHeaderFill;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  opts.kitchenItems.forEach((item, idx) => {
    const row = ws2.addRow([
      idx + 1,
      item.item_code || `KIT-${String(item.id).padStart(5, '0')}`,
      item.item_name,
      item.quantity,
      item.unit,
      item.unit_price,
      item.quantity * item.unit_price,
      item.reorder_level,
      item.location || 'Store Room A',
    ]);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      if ([1, 2, 5, 8].includes(colNum)) cell.alignment = { horizontal: 'center' };
      if ([4, 6, 7].includes(colNum)) {
        cell.alignment = { horizontal: 'right' };
        if (colNum >= 6) cell.numFmt = '#,##0';
      }
    });
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 3: STOCK ISSUANCES REGISTER
  ───────────────────────────────────────────────────────────── */
  const ws3 = wb.addWorksheet('Stock Issuances', { properties: { tabColor: { argb: 'FF2563EB' } } });
  addSchoolHeader(ws3, 'Store Issuance Requisitions & Approval Log', 'K');

  const h3 = ws3.addRow([
    '#', 'Issuance No', 'Date', 'Item Description', 'Qty Issued', 'Unit',
    'Value (KES)', 'Recipient / Issued To', 'Department', 'Status', 'Approved By'
  ]);
  h3.font = headerFont;
  h3.eachCell((cell) => {
    cell.fill = tableHeaderFill;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  opts.issuances.forEach((iss, idx) => {
    const row = ws3.addRow([
      idx + 1,
      iss.issuance_number,
      iss.created_at ? new Date(iss.created_at).toLocaleDateString('en-KE') : '—',
      iss.item_name,
      iss.quantity,
      iss.unit,
      iss.total_value,
      iss.issued_to,
      iss.department || '—',
      iss.status,
      iss.approved_by || '—',
    ]);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      if ([1, 2, 3, 6, 10].includes(colNum)) cell.alignment = { horizontal: 'center' };
      if ([5, 7].includes(colNum)) {
        cell.alignment = { horizontal: 'right' };
        if (colNum === 7) cell.numFmt = '#,##0';
      }
    });
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 4: GOODS RECEIVED NOTES (GRN)
  ───────────────────────────────────────────────────────────── */
  const ws4 = wb.addWorksheet('Goods Received (GRN)', { properties: { tabColor: { argb: 'FF16A34A' } } });
  addSchoolHeader(ws4, 'Goods Received Notes & Supplier Deliveries Inwards', 'J');

  const h4 = ws4.addRow([
    '#', 'GRN Number', 'Delivery Date', 'Item Delivered', 'Quantity Received', 'Unit',
    'Unit Cost (KES)', 'Total Cost (KES)', 'Supplier / Vendor', 'Invoice Ref / LPO'
  ]);
  h4.font = headerFont;
  h4.eachCell((cell) => {
    cell.fill = tableHeaderFill;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  opts.grns.forEach((grn, idx) => {
    const row = ws4.addRow([
      idx + 1,
      grn.grn_number,
      grn.delivery_date || '—',
      grn.item_name,
      grn.quantity,
      grn.unit,
      grn.unit_cost,
      grn.total_cost,
      grn.supplier,
      grn.invoice_ref || '—',
    ]);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      if ([1, 2, 3, 6].includes(colNum)) cell.alignment = { horizontal: 'center' };
      if ([5, 7, 8].includes(colNum)) {
        cell.alignment = { horizontal: 'right' };
        if (colNum >= 7) cell.numFmt = '#,##0';
      }
    });
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 5: LOW STOCK & CRITICAL REORDER AUDIT
  ───────────────────────────────────────────────────────────── */
  const ws5 = wb.addWorksheet('Low Stock Alerts', { properties: { tabColor: { argb: 'FFDC2626' } } });
  addSchoolHeader(ws5, 'Critical & Low Stock Replenishment Schedule', 'H');

  const h5 = ws5.addRow([
    '#', 'Item Code', 'Item Description', 'Current Stock', 'Reorder Level', 'Stock Deficit',
    'Unit Cost (KES)', 'Estimated Replenishment Cost (KES)'
  ]);
  h5.font = headerFont;
  h5.eachCell((cell) => {
    cell.fill = tableHeaderFill;
    cell.border = thinBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  opts.lowStockItems.forEach((item, idx) => {
    const shortfall = Math.max(0, (item.reorder_level || 5) - item.quantity);
    const row = ws5.addRow([
      idx + 1,
      item.item_code,
      item.item_name,
      item.quantity,
      item.reorder_level,
      shortfall,
      item.unit_price,
      shortfall * item.unit_price,
    ]);
    row.eachCell((cell, colNum) => {
      cell.border = thinBorder;
      if ([1, 2].includes(colNum)) cell.alignment = { horizontal: 'center' };
      if ([4, 5, 6, 7, 8].includes(colNum)) {
        cell.alignment = { horizontal: 'right' };
        if (colNum >= 7) cell.numFmt = '#,##0';
      }
    });
  });

  // Auto-fit column widths across all sheets
  [ws1, ws2, ws3, ws4, ws5].forEach((ws) => {
    ws.columns.forEach((column) => {
      let maxLen = 12;
      column.eachCell?.({ includeEmpty: false }, (cell) => {
        const val = cell.value ? cell.value.toString() : '';
        if (val.length > maxLen) maxLen = Math.min(val.length + 2, 45);
      });
      column.width = maxLen;
    });
  });

  // Write and trigger browser download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `APSIMS_STORES_REGISTER_${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

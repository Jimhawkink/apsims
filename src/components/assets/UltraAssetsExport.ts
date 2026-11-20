/**
 * UltraAssetsExport.ts
 * Enterprise Multi-Sheet Excel Workbook Exporter for School Asset Management
 * Registered School: ST. CATHERINE GIRL'S SCHOOL TEGAT (Reg: 2566)
 */

import ExcelJS from 'exceljs';

export interface AssetExportItem {
  id: number;
  asset_name: string;
  asset_code?: string;
  category: string;
  location?: string;
  assigned_to?: string;
  serial_number?: string;
  quantity?: number;
  purchase_date?: string;
  purchase_price: number;
  current_value: number;
  book_value: number;
  accumulated_depreciation: number;
  depreciation_rate?: number;
  useful_life_years?: number;
  condition: string;
  status: string;
  supplier?: string;
  warranty_expiry?: string;
  notes?: string;
}

export interface MaintenanceExportItem {
  id: number;
  asset_name: string;
  asset_code?: string;
  maintenance_date: string;
  maintenance_type: string;
  description: string;
  cost: number;
  technician?: string;
  next_maintenance?: string;
  status: string;
}

export interface ExportAssetsOptions {
  schoolName?: string;
  schoolMotto?: string;
  schoolRegNo?: string;
  schoolPostal?: string;
  academicYear?: number;
  assets: AssetExportItem[];
  maintenance?: MaintenanceExportItem[];
}

export async function exportUltraAssetsExcel({
  schoolName = "ST. CATHERINE GIRL'S SCHOOL TEGAT",
  schoolMotto = "Excellence in Education",
  schoolRegNo = "2566",
  schoolPostal = "P.O. Box 112 Bomet",
  academicYear = new Date().getFullYear(),
  assets = [],
  maintenance = [],
}: ExportAssetsOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'APSIMS Ultra Asset Suite';
  workbook.created = new Date();

  const primaryColor = '1E3A8A'; // Deep Navy
  const secondaryColor = '3B82F6'; // Royal Blue
  const headerFont = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };

  // Calculations
  const totalAssetsCount = assets.reduce((s, a) => s + (Number(a.quantity) || 1), 0);
  const totalPurchaseValue = assets.reduce((s, a) => s + (Number(a.purchase_price) || 0) * (Number(a.quantity) || 1), 0);
  const totalBookValue = assets.reduce((s, a) => s + (Number(a.book_value) || 0) * (Number(a.quantity) || 1), 0);
  const totalDepreciation = Math.max(0, totalPurchaseValue - totalBookValue);
  const activeCount = assets.filter((a) => (a.status || 'Active').toLowerCase() === 'active').length;
  const maintenanceCount = assets.filter((a) => (a.status || '').toLowerCase().includes('maintenance') || (a.condition || '').toLowerCase() === 'poor').length;

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 1: EXECUTIVE ASSET VALUATION & SUMMARY
  // ══════════════════════════════════════════════════════════════════════════
  const sheet1 = workbook.addWorksheet('Asset Valuation Summary', {
    views: [{ showGridLines: true }],
  });

  sheet1.mergeCells('A1:G1');
  const s1Title = sheet1.getCell('A1');
  s1Title.value = `${schoolName.toUpperCase()} — CAPITAL ASSETS AUDIT & REGISTER`;
  s1Title.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  s1Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s1Title.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(1).height = 30;

  sheet1.mergeCells('A2:G2');
  const s1Sub = sheet1.getCell('A2');
  s1Sub.value = `Motto: "${schoolMotto}" | MOE Reg: ${schoolRegNo} | ${schoolPostal} | Asset Audit Cycle: ${academicYear}`;
  s1Sub.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF1F2937' } };
  s1Sub.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet1.getRow(2).height = 20;

  sheet1.mergeCells('A4:D4');
  const kpiHeader = sheet1.getCell('A4');
  kpiHeader.value = 'CAPITAL ASSETS INVENTORY POSITION (AUDITED)';
  kpiHeader.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  kpiHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };

  const summaryRows = [
    ['Indicator Metric', 'Valuation / Count', 'Benchmark / Reference', 'Operational Status'],
    ['Total Registered Capital Assets', assets.length, 'Individual Asset Records', 'Catalogued'],
    ['Total Physical Equipment Units', totalAssetsCount, 'Sum of all Quantities', 'Verified Units'],
    ['Total Acquisition / Historical Cost', totalPurchaseValue, 'Official Purchase Invoices', 'Capital Cost'],
    ['Current Net Book Value (Depreciated)', totalBookValue, 'MoE Standard Depreciation', 'Book Value'],
    ['Accumulated Depreciation to Date', totalDepreciation, 'Depreciation Reserve', 'Amortized'],
    ['Active In-Service Institutional Assets', activeCount, `${Math.round((activeCount / Math.max(1, assets.length)) * 100)}% of Register`, 'Operational'],
    ['Assets Requiring Maintenance / In Repair', maintenanceCount, 'Immediate Inspection Due', maintenanceCount > 0 ? 'Follow-Up Due' : 'All Sound'],
  ];

  summaryRows.forEach((r, idx) => {
    const rowNum = 5 + idx;
    const row = sheet1.getRow(rowNum);
    row.values = r;
    if (idx === 0) {
      row.eachCell((c) => {
        c.font = { name: 'Calibri', size: 9, bold: true };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      });
    } else {
      if (typeof r[1] === 'number' && String(r[0]).includes('Cost') || String(r[0]).includes('Value') || String(r[0]).includes('Depreciation')) {
        const c2 = sheet1.getCell(`B${rowNum}`);
        c2.numFmt = '#,##0.00';
      }
    }
  });

  sheet1.columns = [
    { width: 42 },
    { width: 28 },
    { width: 28 },
    { width: 24 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 2: MASTER ASSET INVENTORY REGISTER
  // ══════════════════════════════════════════════════════════════════════════
  const sheet2 = workbook.addWorksheet('Master Asset Register', {
    views: [{ showGridLines: true }],
  });

  sheet2.mergeCells('A1:L1');
  const s2Title = sheet2.getCell('A1');
  s2Title.value = 'COMPLETE INSTITUTIONAL ASSET INVENTORY REGISTER';
  s2Title.font = headerFont;
  s2Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s2Title.alignment = { horizontal: 'center' };

  const regHeaders = [
    'Asset Code', 'Asset Name', 'Category', 'Location', 'Assigned To / Custodian',
    'Serial Number', 'Qty', 'Purchase Date', 'Cost (KES)', 'Book Value (KES)', 'Condition', 'Status'
  ];

  const s2Row2 = sheet2.getRow(2);
  regHeaders.forEach((h, i) => {
    const c = s2Row2.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
  });

  assets.forEach((a, idx) => {
    const rowNum = 3 + idx;
    const r = sheet2.getRow(rowNum);
    r.getCell(1).value = a.asset_code || `AST-${String(a.id).padStart(4, '0')}`;
    r.getCell(2).value = a.asset_name;
    r.getCell(3).value = a.category;
    r.getCell(4).value = a.location || '—';
    r.getCell(5).value = a.assigned_to || '—';
    r.getCell(6).value = a.serial_number || '—';
    r.getCell(7).value = a.quantity || 1;
    r.getCell(8).value = a.purchase_date || '—';
    
    const costCell = r.getCell(9);
    costCell.value = Number(a.purchase_price) || 0;
    costCell.numFmt = '#,##0.00';

    const bookCell = r.getCell(10);
    bookCell.value = Number(a.book_value) || 0;
    bookCell.numFmt = '#,##0.00';

    r.getCell(11).value = a.condition || 'Good';
    r.getCell(12).value = a.status || 'Active';
  });

  sheet2.columns = [
    { width: 14 },
    { width: 28 },
    { width: 20 },
    { width: 18 },
    { width: 22 },
    { width: 18 },
    { width: 8 },
    { width: 14 },
    { width: 18 },
    { width: 18 },
    { width: 14 },
    { width: 14 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 3: CATEGORY & ALLOCATION BREAKDOWN
  // ═══════════════════════════════════════════════════════════════
  const sheet3 = workbook.addWorksheet('Category Breakdown', {
    views: [{ showGridLines: true }],
  });

  sheet3.mergeCells('A1:F1');
  const s3Title = sheet3.getCell('A1');
  s3Title.value = 'ASSET DISTRIBUTION BY DEPARTMENT & CATEGORY';
  s3Title.font = headerFont;
  s3Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s3Title.alignment = { horizontal: 'center' };

  const catHeaders = ['Asset Category', 'Total Assets', 'Physical Units', 'Total Cost (KES)', 'Net Book Value (KES)', '% of Portfolio'];
  const s3Row2 = sheet3.getRow(2);
  catHeaders.forEach((h, i) => {
    const c = s3Row2.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
  });

  const categories = Array.from(new Set(assets.map((a) => a.category))).filter(Boolean);
  categories.forEach((cat, idx) => {
    const rowNum = 3 + idx;
    const r = sheet3.getRow(rowNum);
    const catAssets = assets.filter((a) => a.category === cat);
    const catCount = catAssets.length;
    const catUnits = catAssets.reduce((s, a) => s + (Number(a.quantity) || 1), 0);
    const catCost = catAssets.reduce((s, a) => s + (Number(a.purchase_price) || 0) * (Number(a.quantity) || 1), 0);
    const catBook = catAssets.reduce((s, a) => s + (Number(a.book_value) || 0) * (Number(a.quantity) || 1), 0);
    const catPct = totalPurchaseValue > 0 ? Math.round((catCost / totalPurchaseValue) * 100) : 0;

    r.getCell(1).value = cat;
    r.getCell(2).value = catCount;
    r.getCell(3).value = catUnits;
    const c4 = r.getCell(4);
    c4.value = catCost;
    c4.numFmt = '#,##0.00';
    const c5 = r.getCell(5);
    c5.value = catBook;
    c5.numFmt = '#,##0.00';
    r.getCell(6).value = `${catPct}%`;
  });

  sheet3.columns = [
    { width: 28 },
    { width: 16 },
    { width: 16 },
    { width: 22 },
    { width: 22 },
    { width: 16 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // SHEET 4: MAINTENANCE & SERVICE HISTORY
  // ══════════════════════════════════════════════════════════════════════════
  const sheet4 = workbook.addWorksheet('Maintenance History', {
    views: [{ showGridLines: true }],
  });

  sheet4.mergeCells('A1:G1');
  const s4Title = sheet4.getCell('A1');
  s4Title.value = 'ASSET MAINTENANCE, REPAIR & SERVICING REGISTER';
  s4Title.font = headerFont;
  s4Title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
  s4Title.alignment = { horizontal: 'center' };

  const maintHeaders = ['Asset Name', 'Date Serviced', 'Service Type', 'Work Description', 'Service Cost (KES)', 'Technician', 'Next Due Date'];
  const s4Row2 = sheet4.getRow(2);
  maintHeaders.forEach((h, i) => {
    const c = s4Row2.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: secondaryColor } };
  });

  maintenance.forEach((m, idx) => {
    const rowNum = 3 + idx;
    const r = sheet4.getRow(rowNum);
    r.getCell(1).value = m.asset_name;
    r.getCell(2).value = m.maintenance_date;
    r.getCell(3).value = m.maintenance_type;
    r.getCell(4).value = m.description;
    const costCell = r.getCell(5);
    costCell.value = Number(m.cost) || 0;
    costCell.numFmt = '#,##0.00';
    r.getCell(6).value = m.technician || '—';
    r.getCell(7).value = m.next_maintenance || '—';
  });

  sheet4.columns = [
    { width: 26 },
    { width: 16 },
    { width: 16 },
    { width: 34 },
    { width: 18 },
    { width: 20 },
    { width: 18 },
  ];

  // ══════════════════════════════════════════════════════════════════════════
  // GENERATE & TRIGGER DOWNLOAD
  // ══════════════════════════════════════════════════════════════════════════
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${schoolName.replace(/[^a-zA-Z0-9]/g, '_')}_CAPITAL_ASSETS_MASTER_REGISTER_${academicYear}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
}

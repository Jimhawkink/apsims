'use client';

import { fmt } from '@/hooks/useUltraFeeCollect';

interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  studentName: string;
  admissionNo: string;
  formStream: string;
  parentName?: string;
  parentPhone?: string;
  paymentMethod: string;
  reference?: string;
  amount: number;
  totalPaid: number;
  termFees: number;
  termBalance: number;
  annualFees: number;
  annualBalance: number;
  allocations?: { head: string; amount: number }[];
  bursaryApplied?: number;
  capitationApplied?: number;
  waiverApplied?: number;
  schoolName?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;
  schoolMotto?: string;
  cashier?: string;
}

export function printThermalReceipt(data: ReceiptData) {
  const w = window.open('', '_blank');
  if (!w) return;

  const school = data.schoolName || 'ALPHA PREMIER SCHOOL';
  const addr = data.schoolAddress || 'P.O. Box 000, Nairobi';
  const phone = data.schoolPhone || 'Tel: 0700 000 000';
  const email = data.schoolEmail || '';
  const motto = data.schoolMotto || 'Excellence in Education';

  const allocRows = (data.allocations || [])
    .map(a => `<tr><td style="padding:2px 0;font-size:11px;color:#333;">${a.head}</td><td style="padding:2px 0;font-size:11px;text-align:right;font-weight:600;">KES ${a.amount.toLocaleString()}</td></tr>`)
    .join('');

  const creditsSection = (data.bursaryApplied || data.capitationApplied || data.waiverApplied) ? `
    <div style="margin:6px 0;padding:6px 0;border-top:1px dashed #aaa;">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#666;margin-bottom:3px;letter-spacing:1px;">Credits & Subsidies</div>
      ${data.bursaryApplied ? `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>Bursary Applied</span><span style="font-weight:600;color:#16a34a;">-KES ${data.bursaryApplied.toLocaleString()}</span></div>` : ''}
      ${data.capitationApplied ? `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>MoE Capitation</span><span style="font-weight:600;color:#16a34a;">-KES ${data.capitationApplied.toLocaleString()}</span></div>` : ''}
      ${data.waiverApplied ? `<div style="display:flex;justify-content:space-between;font-size:11px;"><span>Waiver</span><span style="font-weight:600;color:#16a34a;">-KES ${data.waiverApplied.toLocaleString()}</span></div>` : ''}
    </div>
  ` : '';

  const dateStr = new Date(data.paymentDate).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
  const pctPaid = data.annualFees > 0 ? Math.round((data.totalPaid / data.annualFees) * 100) : 0;

  w.document.write(`<!DOCTYPE html><html><head><title>Receipt ${data.receiptNumber}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  @media print {
    html, body { width: 80mm; margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', 'Consolas', monospace;
    width: 80mm;
    margin: 0 auto;
    padding: 4mm 3mm;
    color: #000;
    background: #fff;
    font-size: 12px;
    line-height: 1.3;
  }
  .divider { border-top: 1px dashed #000; margin: 5px 0; }
  .divider-thick { border-top: 2px solid #000; margin: 6px 0; }
  .divider-double { border-top: 3px double #000; margin: 6px 0; }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: 700; }
  .row { display: flex; justify-content: space-between; padding: 1px 0; }
  .row-label { font-size: 10px; color: #555; }
  .row-value { font-size: 11px; font-weight: 600; }
  .amount-box {
    text-align: center;
    padding: 8px 4px;
    margin: 6px 0;
    border: 2px solid #000;
    background: #f5f5f5;
  }
  .amount-box .label { font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #555; }
  .amount-box .value { font-size: 22px; font-weight: 900; margin-top: 2px; letter-spacing: 1px; }
  .receipt-no {
    text-align: center;
    padding: 4px;
    margin: 4px 0;
    background: #eee;
    border: 1px solid #ccc;
    font-family: monospace;
    font-size: 13px;
    font-weight: 900;
    letter-spacing: 2px;
  }
  .progress-bar {
    width: 100%;
    height: 8px;
    background: #ddd;
    border-radius: 4px;
    overflow: hidden;
    margin: 3px 0;
  }
  .progress-fill {
    height: 100%;
    background: #000;
    border-radius: 4px;
  }
  .info-table { width: 100%; border-collapse: collapse; }
  .info-table td { padding: 2px 0; vertical-align: top; }
  .info-table .lbl { font-size: 9px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; width: 80px; }
  .info-table .val { font-size: 11px; font-weight: 600; color: #000; }
  .alloc-table { width: 100%; border-collapse: collapse; }
  .alloc-table td { padding: 2px 0; }
  .balance-row { display: flex; justify-content: space-between; padding: 2px 0; }
  .balance-label { font-size: 10px; color: #555; }
  .balance-value { font-size: 11px; font-weight: 700; }
  .qr-placeholder {
    width: 60px; height: 60px;
    margin: 6px auto;
    border: 2px solid #000;
    display: flex; align-items: center; justify-content: center;
    font-size: 7px; color: #999; text-align: center;
  }
  .footer-line { font-size: 8px; color: #999; text-align: center; margin: 1px 0; }
  .cut-line {
    text-align: center;
    margin: 8px 0 0;
    font-size: 8px;
    color: #ccc;
    letter-spacing: 3px;
  }
  .stamp-box {
    margin: 4px auto;
    width: 50mm;
    height: 14mm;
    border: 1px dashed #aaa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: #bbb;
  }
</style></head><body>

<!-- ═══════ HEADER ═══════ -->
<div class="center" style="padding-bottom:4px;">
  <div style="font-size:8px;letter-spacing:3px;color:#888;margin-bottom:2px;">🏫 🏫 🏫</div>
  <div style="font-size:16px;font-weight:900;letter-spacing:1px;">${school}</div>
  <div style="font-size:9px;color:#666;margin-top:2px;">${addr}</div>
  <div style="font-size:9px;color:#666;">${phone}${email ? ' • ' + email : ''}</div>
  <div style="font-size:8px;font-style:italic;color:#999;margin-top:2px;">"${motto}"</div>
</div>

<div class="divider-double"></div>

<!-- ═══════ TITLE ═══════ -->
<div class="center" style="padding:3px 0;">
  <div style="font-size:12px;font-weight:900;letter-spacing:3px;text-transform:uppercase;">FEE PAYMENT RECEIPT</div>
  <div style="font-size:8px;color:#888;margin-top:1px;">ORIGINAL / STUDENT COPY</div>
</div>

<div class="divider-thick"></div>

<!-- ═══════ RECEIPT NO ═══════ -->
<div class="receipt-no">${data.receiptNumber}</div>

<!-- ═══════ DATE & TIME ═══════ -->
<div class="row" style="margin:4px 0;">
  <span style="font-size:10px;color:#666;">📅 ${dateStr}</span>
  <span style="font-size:10px;color:#666;">🕐 ${timeStr}</span>
</div>

<div class="divider"></div>

<!-- ═══════ STUDENT INFO ═══════ -->
<div style="margin:4px 0;">
  <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:3px;">Student Details</div>
  <table class="info-table">
    <tr><td class="lbl">Name</td><td class="val">${data.studentName}</td></tr>
    <tr><td class="lbl">Adm No</td><td class="val" style="font-family:monospace;letter-spacing:1px;">${data.admissionNo}</td></tr>
    <tr><td class="lbl">Class</td><td class="val">${data.formStream}</td></tr>
    ${data.parentName ? `<tr><td class="lbl">Parent</td><td class="val">${data.parentName}</td></tr>` : ''}
    ${data.parentPhone ? `<tr><td class="lbl">Phone</td><td class="val">${data.parentPhone}</td></tr>` : ''}
  </table>
</div>

<div class="divider"></div>

<!-- ═══════ PAYMENT INFO ═══════ -->
<div style="margin:4px 0;">
  <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:3px;">Payment Details</div>
  <table class="info-table">
    <tr><td class="lbl">Method</td><td class="val">${data.paymentMethod}</td></tr>
    ${data.reference ? `<tr><td class="lbl">Ref No</td><td class="val" style="font-family:monospace;letter-spacing:0.5px;">${data.reference}</td></tr>` : ''}
  </table>
</div>

<!-- ═══════ ALLOCATION BREAKDOWN ═══════ -->
${allocRows ? `
<div class="divider"></div>
<div style="margin:4px 0;">
  <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:3px;">Allocation</div>
  <table class="alloc-table">${allocRows}</table>
</div>
` : ''}

<!-- ═══════ AMOUNT BOX ═══════ -->
<div class="amount-box">
  <div class="label">Amount Received</div>
  <div class="value">KES ${data.amount.toLocaleString()}</div>
</div>

${creditsSection}

<div class="divider-thick"></div>

<!-- ═══════ FEE SUMMARY ═══════ -->
<div style="margin:4px 0;">
  <div style="font-size:8px;font-weight:700;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin-bottom:3px;">Fee Summary</div>
  
  <div class="balance-row">
    <span class="balance-label">Term Fees</span>
    <span class="balance-value">KES ${data.termFees.toLocaleString()}</span>
  </div>
  <div class="balance-row">
    <span class="balance-label">Total Paid (All Terms)</span>
    <span class="balance-value">KES ${data.totalPaid.toLocaleString()}</span>
  </div>
  <div class="balance-row" style="border-top:1px solid #ddd;padding-top:3px;margin-top:2px;">
    <span class="balance-label" style="font-weight:700;color:#000;">Term Balance</span>
    <span class="balance-value" style="font-size:13px;">KES ${data.termBalance.toLocaleString()}</span>
  </div>
  <div class="balance-row">
    <span class="balance-label">Annual Fees</span>
    <span class="balance-value">KES ${data.annualFees.toLocaleString()}</span>
  </div>
  <div class="balance-row" style="border-top:1px solid #ddd;padding-top:3px;margin-top:2px;">
    <span class="balance-label" style="font-weight:700;color:#000;">Annual Balance</span>
    <span class="balance-value" style="font-size:13px;">KES ${data.annualBalance.toLocaleString()}</span>
  </div>
</div>

<!-- ═══════ PAYMENT PROGRESS BAR ═══════ -->
<div style="margin:6px 0;">
  <div style="display:flex;justify-content:space-between;font-size:9px;color:#666;margin-bottom:2px;">
    <span>Payment Progress</span>
    <span style="font-weight:700;">${pctPaid}%</span>
  </div>
  <div class="progress-bar">
    <div class="progress-fill" style="width:${Math.min(100, pctPaid)}%;"></div>
  </div>
</div>

<div class="divider-double"></div>

<!-- ═══════ QR CODE PLACEHOLDER ═══════ -->
<div class="qr-placeholder">
  <div>QR<br/>VERIFY</div>
</div>

<!-- ═══════ VERIFICATION ═══════ -->
<div class="center" style="margin:4px 0;">
  <div style="font-size:8px;color:#999;font-family:monospace;letter-spacing:0.5px;">Verification: ${data.receiptNumber}-${Date.now().toString(36).toUpperCase()}</div>
</div>

<!-- ═══════ STAMP BOX ═══════ -->
<div class="stamp-box">OFFICIAL STAMP / SIGNATURE</div>

<div class="divider-thick"></div>

<!-- ═══════ FOOTER ═══════ -->
<div style="padding:4px 0;">
  <div class="footer-line">Thank you for your prompt payment</div>
  <div class="footer-line">This is a computer-generated receipt</div>
  <div class="footer-line">No signature required for amounts below KES 50,000</div>
  ${data.cashier ? `<div class="footer-line">Cashier: ${data.cashier}</div>` : ''}
  <div class="footer-line" style="margin-top:3px;">Printed: ${new Date().toLocaleString('en-KE')}</div>
  <div class="footer-line">Powered by APSIMS™ School Management System</div>
</div>

<!-- ═══════ CUT LINE ═══════ -->
<div class="cut-line">✂ - - - - - - - - - - - - - - - - ✂</div>

<!-- ═══════ PRINT BUTTON ═══════ -->
<div class="no-print" style="text-align:center;margin:12px 0;">
  <button onclick="window.print()" style="padding:8px 24px;background:#000;color:#fff;border:none;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;margin-right:8px;">🖨️ PRINT</button>
  <button onclick="window.close()" style="padding:8px 24px;background:#eee;color:#333;border:1px solid #ccc;border-radius:4px;font-size:12px;font-weight:700;cursor:pointer;">✕ CLOSE</button>
</div>

</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
}

export function printDemandLetter(student: any, fees: any, schoolName?: string) {
  const w = window.open('', '_blank');
  if (!w) return;

  const school = schoolName || 'ALPHA PREMIER SCHOOL';
  const dateStr = new Date().toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' });
  const name = `${student.first_name} ${student.last_name}`;
  const adm = student.admission_no || student.admission_number || '';

  w.document.write(`<!DOCTYPE html><html><head><title>Demand Letter - ${adm}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; padding: 40px; max-width: 700px; margin: 0 auto; color: #1a1a1a; font-size: 14px; line-height: 1.7; }
  .header { text-align: center; padding-bottom: 16px; border-bottom: 3px double #000; margin-bottom: 20px; }
  .header h1 { font-size: 22px; font-weight: 900; letter-spacing: 2px; }
  .header p { font-size: 11px; color: #666; }
  .ref { margin: 16px 0; font-size: 12px; }
  .ref span { font-weight: 700; }
  .body-text { margin: 12px 0; text-align: justify; }
  .amount-highlight { font-weight: 900; font-size: 16px; color: #c00; }
  table.fee-summary { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.fee-summary th, table.fee-summary td { padding: 8px 12px; border: 1px solid #ddd; font-size: 13px; }
  table.fee-summary th { background: #f5f5f5; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
  .signature { margin-top: 40px; }
  .signature .line { border-top: 1px solid #000; width: 200px; margin-top: 40px; padding-top: 4px; font-size: 12px; }
  .no-print { text-align: center; margin: 20px 0; }
  @media print { .no-print { display: none; } }
</style></head><body>
<div class="header">
  <h1>${school}</h1>
  <p>P.O. Box 000, Nairobi | Tel: 0700 000 000</p>
</div>

<div class="ref">
  <p>Date: <span>${dateStr}</span></p>
  <p>Ref: <span>DL/${adm}/${new Date().getFullYear()}</span></p>
</div>

<p class="body-text"><strong>Dear Parent/Guardian of ${name} (${adm}),</strong></p>

<p class="body-text"><strong>RE: OUTSTANDING FEE BALANCE</strong></p>

<p class="body-text">This letter serves as a formal reminder regarding the outstanding school fees balance for your child/ward <strong>${name}</strong>, Admission Number <strong>${adm}</strong>.</p>

<table class="fee-summary">
  <tr><th>Description</th><th style="text-align:right;">Amount (KES)</th></tr>
  <tr><td>Term Fees</td><td style="text-align:right;font-weight:600;">${fees.termTotal?.toLocaleString() || '0'}</td></tr>
  <tr><td>Total Paid</td><td style="text-align:right;font-weight:600;color:#16a34a;">${fees.totalPaid?.toLocaleString() || '0'}</td></tr>
  <tr><td>Bursary/Capitation Credits</td><td style="text-align:right;font-weight:600;color:#16a34a;">-${((fees.bursaryTotal || 0) + (fees.capitationTotal || 0)).toLocaleString()}</td></tr>
  <tr style="background:#fff3f3;"><td style="font-weight:900;">OUTSTANDING BALANCE</td><td style="text-align:right;"><span class="amount-highlight">KES ${(fees.termBalance || 0).toLocaleString()}</span></td></tr>
</table>

<p class="body-text">We kindly request that the above balance be settled within <strong>14 days</strong> from the date of this letter to ensure uninterrupted learning for your child.</p>

<p class="body-text">Should you have any queries regarding this statement, or if you have already made payment, please contact the school bursar's office with proof of payment.</p>

<p class="body-text">Thank you for your cooperation and continued support.</p>

<div class="signature">
  <p>Yours faithfully,</p>
  <div class="line">School Bursar</div>
  <div class="line" style="margin-top:20px;">Principal</div>
</div>

<div class="no-print">
  <button onclick="window.print()" style="padding:10px 30px;background:#c00;color:#fff;border:none;border-radius:6px;font-size:14px;font-weight:700;cursor:pointer;">🖨️ Print Letter</button>
</div>
</body></html>`);
  w.document.close();
}

/**
 * Super Premium Official A4 Fee Payment Voucher & Receipt
 */
export function printA4OfficialReceipt(data: ReceiptData) {
  const w = window.open('', '_blank');
  if (!w) return;

  const school = data.schoolName || 'ALPHA PREMIER SCHOOL';
  const addr = data.schoolAddress || 'P.O. Box 000, Nairobi, Kenya';
  const phone = data.schoolPhone || 'Tel: +254 700 000 000';
  const email = data.schoolEmail || 'finance@alphapremier.ac.ke';
  const motto = data.schoolMotto || 'Excellence, Integrity & Leadership';
  const dateStr = new Date(data.paymentDate).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });

  w.document.write(`<!DOCTYPE html><html><head><title>Official Receipt - ${data.receiptNumber}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  @media print {
    .no-print { display: none !important; }
    body { margin: 0; padding: 0; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    color: #0f172a;
    background: #ffffff;
    padding: 24px;
    line-height: 1.45;
    font-size: 13px;
  }
  .receipt-container {
    max-width: 780px;
    margin: 0 auto;
    border: 2px solid #1e3a8a;
    border-radius: 12px;
    padding: 28px;
    position: relative;
    background: #ffffff;
  }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #1e3a8a;
    padding-bottom: 16px;
    margin-bottom: 20px;
  }
  .brand-title {
    font-size: 22px;
    font-weight: 900;
    color: #1e3a8a;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .brand-sub {
    font-size: 11px;
    color: #475569;
    margin-top: 3px;
  }
  .badge-rcpt {
    background: #1e3a8a;
    color: #ffffff;
    padding: 6px 16px;
    border-radius: 6px;
    font-weight: 800;
    font-size: 14px;
    text-align: right;
    letter-spacing: 0.5px;
  }
  .badge-rcpt small {
    display: block;
    font-size: 9px;
    opacity: 0.85;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 20px;
  }
  .meta-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px 14px;
  }
  .meta-box-title {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #1e3a8a;
    margin-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
  }
  .meta-row {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    font-size: 11.5px;
  }
  .meta-label { color: #64748b; font-weight: 600; }
  .meta-val { color: #0f172a; font-weight: 700; text-align: right; }
  .amt-banner {
    background: #eff6ff;
    border: 2px solid #3b82f6;
    border-radius: 10px;
    padding: 14px 20px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .amt-banner-lbl { font-size: 11px; font-weight: 800; color: #1e40af; text-transform: uppercase; letter-spacing: 1px; }
  .amt-banner-val { font-size: 26px; font-weight: 900; color: #1e3a8a; font-family: monospace; }
  .table-section { margin-bottom: 20px; }
  .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e3a8a; letter-spacing: 0.8px; margin-bottom: 6px; }
  table.ledger-table { width: 100%; border-collapse: collapse; }
  table.ledger-table th { background: #1e3a8a; color: #fff; padding: 7px 10px; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  table.ledger-table td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11.5px; }
  .balances-card {
    background: #f8fafc;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 24px;
  }
  .sig-section {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
    margin-top: 36px;
    padding-top: 16px;
    border-top: 1px dashed #cbd5e1;
    text-align: center;
  }
  .sig-box {
    border-top: 1.5px solid #0f172a;
    padding-top: 6px;
    font-size: 10.5px;
    font-weight: 700;
    color: #475569;
  }
  .stamp-box-a4 {
    border: 2px dashed #94a3b8;
    height: 70px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    color: #94a3b8;
    border-radius: 6px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .footer-a4 {
    margin-top: 24px;
    text-align: center;
    font-size: 10px;
    color: #94a3b8;
    border-top: 1px solid #e2e8f0;
    padding-top: 10px;
  }
  .watermark {
    position: absolute;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-30deg);
    font-size: 72px;
    font-weight: 900;
    color: rgba(30, 58, 138, 0.04);
    letter-spacing: 8px;
    pointer-events: none;
    text-transform: uppercase;
  }
</style></head><body>
<div class="receipt-container">
  <div class="watermark">OFFICIAL RECEIPT</div>

  <!-- Header -->
  <div class="header">
    <div>
      <div class="brand-title">${school}</div>
      <div class="brand-sub">${addr} • ${phone} • ${email}</div>
      <div style="font-size:10px;color:#1e3a8a;font-style:italic;margin-top:3px;">"${motto}"</div>
    </div>
    <div class="badge-rcpt">
      <small>OFFICIAL FEE RECEIPT</small>
      <span>${data.receiptNumber}</span>
    </div>
  </div>

  <!-- Metadata Grid -->
  <div class="meta-grid">
    <div class="meta-box">
      <div class="meta-box-title">Student Particulars</div>
      <div class="meta-row"><span class="meta-label">Full Name:</span><span class="meta-val">${data.studentName}</span></div>
      <div class="meta-row"><span class="meta-label">Admission No:</span><span class="meta-val" style="font-family:monospace;">${data.admissionNo}</span></div>
      <div class="meta-row"><span class="meta-label">Class / Stream:</span><span class="meta-val">${data.formStream}</span></div>
      ${data.parentPhone ? `<div class="meta-row"><span class="meta-label">Parent Contact:</span><span class="meta-val">${data.parentPhone}</span></div>` : ''}
    </div>

    <div class="meta-box">
      <div class="meta-box-title">Transaction Particulars</div>
      <div class="meta-row"><span class="meta-label">Payment Date:</span><span class="meta-val">${dateStr}</span></div>
      <div class="meta-row"><span class="meta-label">Payment Rail:</span><span class="meta-val">${data.paymentMethod}</span></div>
      ${data.reference ? `<div class="meta-row"><span class="meta-label">Ref / Transaction Code:</span><span class="meta-val" style="font-family:monospace;color:#1e3a8a;">${data.reference}</span></div>` : ''}
      <div class="meta-row"><span class="meta-label">Issuing Terminal:</span><span class="meta-val">${data.cashier || 'Cashier Command Desk'}</span></div>
    </div>
  </div>

  <!-- Big Amount Banner -->
  <div class="amt-banner">
    <div>
      <div class="amt-banner-lbl">Total Amount Received</div>
      <div style="font-size:11px;color:#334155;margin-top:2px;">Received with thanks in full settlement</div>
    </div>
    <div class="amt-banner-val">KES ${Number(data.amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</div>
  </div>

  <!-- Student Current Fee Position -->
  <div class="table-section">
    <div class="section-title">Current Fee Position & Clearance Status</div>
    <table class="ledger-table">
      <thead>
        <tr>
          <th>Obligation Item</th>
          <th style="text-align:right;">Billed Total (KES)</th>
          <th style="text-align:right;">Paid to Date (KES)</th>
          <th style="text-align:right;">Outstanding Due (KES)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Current Academic Term</strong></td>
          <td style="text-align:right;">${Number(data.termFees || 0).toLocaleString('en-KE')}</td>
          <td style="text-align:right;color:#15803d;font-weight:700;">${Number(data.totalPaid || 0).toLocaleString('en-KE')}</td>
          <td style="text-align:right;color:${(data.termBalance || 0) > 0 ? '#b91c1c' : '#15803d'};font-weight:800;">
            ${Number(data.termBalance || 0).toLocaleString('en-KE')}
          </td>
        </tr>
        <tr>
          <td><strong>Full Academic Year</strong></td>
          <td style="text-align:right;">${Number(data.annualFees || 0).toLocaleString('en-KE')}</td>
          <td style="text-align:right;color:#15803d;font-weight:700;">${Number(data.totalPaid || 0).toLocaleString('en-KE')}</td>
          <td style="text-align:right;color:${(data.annualBalance || 0) > 0 ? '#b91c1c' : '#15803d'};font-weight:800;">
            ${Number(data.annualBalance || 0).toLocaleString('en-KE')}
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Stamp and Signatures -->
  <div class="sig-section">
    <div>
      <div class="stamp-box-a4">OFFICIAL STAMP HERE</div>
      <div style="font-size:9px;color:#94a3b8;margin-top:4px;">School Finance Office Stamp</div>
    </div>
    <div>
      <div style="height:48px;"></div>
      <div class="sig-box">Prepared / Received By (Bursar)</div>
    </div>
    <div>
      <div style="height:48px;"></div>
      <div class="sig-box">Authorized Signatory / Principal</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer-a4">
    <div>✅ Thank you for your continued partnership. This is a computer-generated official receipt issued by AlphaSIMS™.</div>
    <div style="margin-top:3px;">Printed on: ${new Date().toLocaleString('en-KE')} • Serial: ${data.receiptNumber}-${Date.now().toString(36).toUpperCase()}</div>
  </div>
</div>

<div class="no-print" style="text-align:center;margin:24px 0;">
  <button onclick="window.print()" style="padding:10px 28px;background:#1e3a8a;color:#fff;border:none;border-radius:6px;font-size:13px;font-weight:800;cursor:pointer;margin-right:10px;">🖨️ PRINT OFFICIAL A4 RECEIPT</button>
  <button onclick="window.close()" style="padding:10px 24px;background:#f1f5f9;color:#334155;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;font-weight:700;cursor:pointer;">✕ CLOSE</button>
</div>
</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
}

/**
 * Super Premium Printable A4 Payments Register / Audit Report
 */
export function printPaymentsRegisterReport({
  schoolName = 'ALPHA PREMIER SCHOOL',
  termName = 'All Terms',
  payments,
  totalAmount,
}: {
  schoolName?: string;
  termName?: string;
  payments: any[];
  totalAmount: number;
}) {
  const w = window.open('', '_blank');
  if (!w) return;

  const dateStr = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const rowsHtml = payments
    .map(
      (p, i) => `
    <tr style="background:${i % 2 === 1 ? '#f8fafc' : '#ffffff'};">
      <td style="padding:6px 8px;text-align:center;font-size:10px;border-bottom:1px solid #e2e8f0;">${i + 1}</td>
      <td style="padding:6px 8px;font-family:monospace;font-size:10.5px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;">${p.receiptNo || p.receipt_number || '—'}</td>
      <td style="padding:6px 8px;font-size:10.5px;border-bottom:1px solid #e2e8f0;">${p.paymentDate || p.payment_date || '—'}</td>
      <td style="padding:6px 8px;font-weight:700;font-size:11px;border-bottom:1px solid #e2e8f0;">${p.studentName || 'Student'}</td>
      <td style="padding:6px 8px;font-family:monospace;font-size:10px;text-align:center;border-bottom:1px solid #e2e8f0;">${p.admNo || '—'}</td>
      <td style="padding:6px 8px;font-size:10px;border-bottom:1px solid #e2e8f0;">${p.formName || '—'}</td>
      <td style="padding:6px 8px;font-size:10px;text-align:center;border-bottom:1px solid #e2e8f0;">${p.paymentMethod || p.payment_method || '—'}</td>
      <td style="padding:6px 8px;font-family:monospace;font-size:10px;border-bottom:1px solid #e2e8f0;">${p.referenceNo || p.mpesa_code || p.reference_number || '—'}</td>
      <td style="padding:6px 8px;text-align:right;font-weight:800;font-size:11px;color:#15803d;border-bottom:1px solid #e2e8f0;">KES ${Number(p.amount || 0).toLocaleString('en-KE')}</td>
    </tr>`
    )
    .join('');

  w.document.write(`<!DOCTYPE html><html><head><title>Payment Transactions Register Report</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  @media print {
    .no-print { display: none !important; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
    color: #0f172a;
    background: #ffffff;
    padding: 20px;
    font-size: 11px;
  }
  .report-header {
    border-bottom: 2.5px solid #1e3a8a;
    padding-bottom: 12px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .title { font-size: 18px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; }
  .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
  .summary-bar {
    display: flex;
    gap: 16px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 14px;
  }
  .summary-item { font-size: 11px; color: #1e40af; }
  .summary-item strong { color: #1e3a8a; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e3a8a; color: #fff; padding: 7px 8px; font-size: 10px; text-transform: uppercase; font-weight: 800; border: 1px solid #1e3a8a; }
  .sign-grid {
    margin-top: 28px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 24px;
    text-align: center;
  }
  .sign-line {
    border-top: 1.5px solid #0f172a;
    margin-top: 36px;
    padding-top: 4px;
    font-size: 10px;
    font-weight: 700;
  }
</style></head><body>
<div class="report-header">
  <div>
    <div class="title">${schoolName}</div>
    <div class="subtitle">Official Fee Payments & Collections Register • Academic Term: ${termName}</div>
  </div>
  <div style="text-align:right;">
    <div style="font-size:10px;color:#64748b;">Report Generated: ${dateStr}</div>
    <div style="font-size:10px;font-weight:700;color:#1e3a8a;">Audit Ready • Certified Ledger</div>
  </div>
</div>

<div class="summary-bar">
  <div class="summary-item">Total Transactions: <strong>${payments.length.toLocaleString()}</strong></div>
  <div class="summary-item">Cumulative Volume: <strong>KES ${Number(totalAmount || 0).toLocaleString('en-KE')}</strong></div>
  <div class="summary-item">Academic Term: <strong>${termName}</strong></div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:30px;">#</th>
      <th>Receipt No</th>
      <th>Date</th>
      <th style="text-align:left;">Student Name</th>
      <th>Adm No</th>
      <th>Class</th>
      <th>Channel</th>
      <th>Reference / Slip</th>
      <th style="text-align:right;">Amount (KES)</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
  <tfoot>
    <tr style="background:#f1f5f9;font-weight:900;">
      <td colspan="8" style="padding:8px;text-align:right;font-size:11px;border-top:2px solid #0f172a;border-bottom:2px double #0f172a;">
        GRAND TOTAL REVENUE (${payments.length} TRANSACTIONS):
      </td>
      <td style="padding:8px;text-align:right;font-size:12px;color:#15803d;border-top:2px solid #0f172a;border-bottom:2px double #0f172a;">
        KES ${Number(totalAmount || 0).toLocaleString('en-KE')}
      </td>
    </tr>
  </tfoot>
</table>

<div class="sign-grid">
  <div>
    <div class="sign-line">Prepared By (Bursar / Cashier)</div>
  </div>
  <div>
    <div class="sign-line">Verified By (Internal Auditor)</div>
  </div>
  <div>
    <div class="sign-line">Approved By (Principal / Board of Management)</div>
  </div>
</div>

<div class="no-print" style="text-align:center;margin-top:20px;">
  <button onclick="window.print()" style="padding:8px 24px;background:#1e3a8a;color:#fff;border:none;border-radius:4px;font-weight:800;cursor:pointer;margin-right:8px;">🖨️ PRINT REGISTER</button>
  <button onclick="window.close()" style="padding:8px 20px;background:#e2e8f0;color:#0f172a;border:none;border-radius:4px;font-weight:700;cursor:pointer;">✕ CLOSE</button>
</div>
</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
}


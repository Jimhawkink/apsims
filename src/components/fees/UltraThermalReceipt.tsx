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

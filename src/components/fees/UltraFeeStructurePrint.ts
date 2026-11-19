/**
 * UltraFeeStructurePrint.ts
 * Executive A4 Printing Suite for Official School Fee Structures & Fee Circulars
 * Formatted to Kenyan Ministry of Education, KNEC, and Board of Management (BOM) standards.
 */

export interface FeeStructurePrintData {
  schoolName: string;
  motto?: string;
  postalAddress?: string;
  physicalAddress?: string;
  county?: string;
  phone?: string;
  email?: string;
  principalName?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  mpesaPaybill?: string;
  academicYear: string | number;
  formName: string;
  curriculumTrack: string;
  items: {
    category: string;
    description?: string;
    term1: number;
    term2: number;
    term3: number;
    annual: number;
  }[];
  totalTerm1: number;
  totalTerm2: number;
  totalTerm3: number;
  grandAnnual: number;
}

export function printOfficialFeeCircular(data: FeeStructurePrintData) {
  const w = window.open('', '_blank');
  if (!w) return;

  const dateStr = new Date().toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const tableRows = data.items.map((it, idx) => `
    <tr style="background: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'}; font-size: 11px;">
      <td style="padding: 6px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
      <td style="padding: 6px 8px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
        ${it.category}
        ${it.description ? `<div style="font-size: 9px; color: #64748b; font-weight: normal;">${it.description}</div>` : ''}
      </td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">
        ${it.term1 > 0 ? Number(it.term1).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}
      </td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">
        ${it.term2 > 0 ? Number(it.term2).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}
      </td>
      <td style="padding: 6px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-family: monospace;">
        ${it.term3 > 0 ? Number(it.term3).toLocaleString('en-KE', { minimumFractionDigits: 2 }) : '—'}
      </td>
      <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; font-family: monospace;">
        ${Number(it.annual).toLocaleString('en-KE', { minimumFractionDigits: 2 })}
      </td>
    </tr>
  `).join('');

  w.document.write(`<!DOCTYPE html><html><head><title>Official Fee Structure - ${data.formName} (${data.academicYear})</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  @media print { .no-print { display: none !important; } }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif; background: #fff; padding: 16px; color: #0f172a; font-size: 11px; }
  .header { border-bottom: 2.5px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 12px; text-align: center; }
  .school-title { font-size: 20px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
  .motto { font-size: 10px; font-style: italic; color: #475569; margin: 2px 0 4px; }
  .contacts { font-size: 9.5px; color: #64748b; }
  .circular-badge { display: inline-block; background: #1e3a8a; color: #fff; font-size: 10.5px; font-weight: 800; padding: 3px 14px; border-radius: 4px; text-transform: uppercase; margin: 10px 0 6px; letter-spacing: 0.5px; }
  .meta-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-bottom: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 10.5px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
  th { background: #1e3a8a; color: #fff; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .bank-box { background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 10px; }
  .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 24px; text-align: center; font-size: 9.5px; }
  .sign-line { border-top: 1px solid #0f172a; margin-top: 36px; padding-top: 4px; font-weight: 700; }
  .stamp-box { border: 2px dashed #94a3b8; height: 50px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-weight: 800; border-radius: 6px; font-size: 9px; }
</style></head><body>

<div class="header">
  <div class="school-title">${data.schoolName}</div>
  ${data.motto ? `<div class="motto">"${data.motto}"</div>` : ''}
  <div class="contacts">
    ${data.postalAddress ? `${data.postalAddress} · ` : ''}
    ${data.physicalAddress ? `${data.physicalAddress} · ` : ''}
    ${data.county ? `${data.county} County · ` : ''}
    ${data.phone ? `Tel: ${data.phone} · ` : ''}
    ${data.email ? `Email: ${data.email}` : ''}
  </div>
  <div><span class="circular-badge">OFFICIAL APPROVED FEES SCHEDULE — ACADEMIC YEAR ${data.academicYear}</span></div>
</div>

<div class="meta-grid">
  <div>
    <div>Target Cohort: <strong>${data.formName}</strong> (${data.curriculumTrack})</div>
    <div>Date of Promulgation: <strong>${dateStr}</strong></div>
  </div>
  <div style="text-align: right;">
    <div>Principal / Head: <strong>${data.principalName || 'Office of the Principal'}</strong></div>
    <div>Compliance: <strong>MoE Basic Education Capitation Approved</strong></div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width: 24px;">#</th>
      <th style="text-align: left;">Vote Head / Category</th>
      <th style="text-align: right; width: 85px;">Term 1 (KES)</th>
      <th style="text-align: right; width: 85px;">Term 2 (KES)</th>
      <th style="text-align: right; width: 85px;">Term 3 (KES)</th>
      <th style="text-align: right; width: 95px;">Total Annual (KES)</th>
    </tr>
  </thead>
  <tbody>
    ${tableRows}
  </tbody>
  <tfoot>
    <tr style="background: #f1f5f9; font-weight: 900; font-size: 11px;">
      <td colspan="2" style="padding: 8px; text-align: left; text-transform: uppercase;">Total School Fee Load:</td>
      <td style="padding: 8px; text-align: right; font-family: monospace; color: #1e3a8a;">KES ${Number(data.totalTerm1).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 8px; text-align: right; font-family: monospace; color: #1e3a8a;">KES ${Number(data.totalTerm2).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 8px; text-align: right; font-family: monospace; color: #1e3a8a;">KES ${Number(data.totalTerm3).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
      <td style="padding: 8px; text-align: right; font-family: monospace; color: #15803d; font-size: 12px;">KES ${Number(data.grandAnnual).toLocaleString('en-KE', { minimumFractionDigits: 2 })}</td>
    </tr>
  </tfoot>
</table>

<div class="bank-box">
  <div style="font-weight: 800; text-transform: uppercase; color: #1e40af; margin-bottom: 4px;">
    Official Fee Payment Instructions:
  </div>
  <div>1. <strong>Bank Deposit / Electronic Transfer:</strong> Bank: <strong>${data.bankName || 'KCB Bank'}</strong> | A/C Name: <strong>${data.bankAccountName || data.schoolName}</strong> | A/C No: <strong>${data.bankAccountNumber || 'Contact Bursar'}</strong> ${data.bankBranch ? `(${data.bankBranch} Branch)` : ''}</div>
  ${data.mpesaPaybill ? `<div>2. <strong>M-Pesa Paybill / Till:</strong> Business No: <strong>${data.mpesaPaybill}</strong> | Account No: <strong>[Student Admission No]</strong></div>` : ''}
  <div style="color: #b91c1c; font-weight: 700; margin-top: 3px;">3. Note: The school strictly does NOT accept counter cash payments. Always quote the student admission number on the bank deposit slip.</div>
</div>

<div class="sign-grid">
  <div>
    <div class="stamp-box">OFFICIAL SCHOOL STAMP</div>
    <div style="font-size: 8.5px; color: #64748b; margin-top: 4px;">Verified Document</div>
  </div>
  <div>
    <div class="sign-line">Senior Bursar / Accounts Desk</div>
    <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Alpha Financial Administration</div>
  </div>
  <div>
    <div class="sign-line">${data.principalName || 'Principal / Headteacher'}</div>
    <div style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Approved by Board of Management</div>
  </div>
</div>

<div class="no-print" style="text-align: center; margin-top: 24px;">
  <button onclick="window.print()" style="padding: 10px 28px; background: #1e3a8a; color: #fff; font-weight: 800; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">
    🖨️ PRINT OFFICIAL FEE CIRCULAR (A4)
  </button>
</div>

</body></html>`);
  w.document.close();
  setTimeout(() => { w.print(); }, 400);
}

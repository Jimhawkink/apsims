// Super Ultra-Premium Health & Clinic Excel Export Engine (ExcelJS)
// Features auto-sizing columns, styled navy headers (#1E3A8A), zebra striping, and multi-sheet reporting

export interface HealthExportData {
  students: any[];
  records: any[];
  visits: any[];
  allergies: any[];
  contacts: any[];
  forms: any[];
  schoolName?: string;
}

export async function exportHealthWorkbook({
  students,
  records,
  visits,
  allergies,
  contacts,
  forms,
  schoolName = 'APSIMS Senior Academy & Health Center',
}: HealthExportData) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'APSIMS Electronic Health System';
  wb.created = new Date();

  const brandFill: any = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E3A8A' }, // Royal Navy
  };

  const headerFont: any = {
    name: 'Calibri',
    size: 11,
    bold: true,
    color: { argb: 'FFFFFFFF' },
  };

  const zebraEvenFill: any = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF8FAFC' },
  };

  const borderStyle: any = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  };

  const getStudent = (id: number) => students.find((s) => s.id === id);
  const getFormName = (formId?: number) => {
    if (!formId) return '—';
    const f = forms.find((fm) => fm.id === formId);
    return f ? f.form_name : `Form ${formId}`;
  };

  /* ─────────────────────────────────────────────────────────────
     SHEET 1: CLINIC OUTPATIENT VISITS
  ────────────────────────────────────────────────────────────── */
  const ws1 = wb.addWorksheet('Clinic Visits Ledger', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  ws1.mergeCells('A1:L1');
  const t1 = ws1.getCell('A1');
  t1.value = `${schoolName} — OUTPATIENT CLINIC VISITS & SICK BAY REGISTER`;
  t1.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F172A' } };
  t1.alignment = { vertical: 'middle' };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws1.getRow(1).height = 28;

  const cols1 = [
    { header: '#', width: 6 },
    { header: 'Visit Date', width: 14 },
    { header: 'Student Name', width: 26 },
    { header: 'Adm No', width: 14 },
    { header: 'Class / Form', width: 18 },
    { header: 'Vitals (Temp / BP)', width: 18 },
    { header: 'Chief Complaint', width: 30 },
    { header: 'Clinical Diagnosis', width: 26 },
    { header: 'Treatment & Care', width: 28 },
    { header: 'Medications Dispensed', width: 28 },
    { header: 'Status / Referral', width: 18 },
    { header: 'Attended By', width: 18 },
  ];

  ws1.getRow(2).values = cols1.map((c) => c.header);
  ws1.getRow(2).height = 26;
  ws1.getRow(2).eachCell((cell) => {
    cell.fill = brandFill;
    cell.font = headerFont;
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderStyle;
  });

  visits.forEach((v, idx) => {
    const st = getStudent(v.student_id);
    const fullName = st ? `${st.last_name}, ${st.first_name}` : '—';
    const tempStr = v.temperature ? `${v.temperature}°C` : '';
    const bpStr = v.blood_pressure ? v.blood_pressure : '';
    const vitalsStr = [tempStr, bpStr].filter(Boolean).join(' | ') || '—';
    const statusStr = v.referred_to ? `REFERRED (${v.referred_to})` : v.discharged ? 'DISCHARGED' : 'OBSERVED';

    const row = ws1.addRow([
      idx + 1,
      v.visit_date || '—',
      fullName,
      st?.admission_number || '—',
      getFormName(st?.form_id),
      vitalsStr,
      v.complaint || '—',
      v.diagnosis || '—',
      v.treatment || '—',
      v.medication_given || '—',
      statusStr,
      v.attended_by || '—',
    ]);

    row.height = 20;
    const isEven = idx % 2 === 1;
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };
      if (isEven) cell.fill = zebraEvenFill;
    });
  });

  // Auto-size columns
  cols1.forEach((c, idx) => {
    let max = c.header.length;
    ws1.getColumn(idx + 1).eachCell({ includeEmpty: false }, (cell, rowNum) => {
      if (rowNum > 1 && cell.value) {
        const len = String(cell.value).length;
        if (len > max) max = len;
      }
    });
    ws1.getColumn(idx + 1).width = Math.min(Math.max(c.width, max + 3), 42);
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 2: HOSPITAL REFERRALS
  ────────────────────────────────────────────────────────────── */
  const referrals = visits.filter((v) => !!v.referred_to);
  const ws2 = wb.addWorksheet('Hospital Referrals', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  ws2.mergeCells('A1:I1');
  const t2 = ws2.getCell('A1');
  t2.value = `${schoolName} — EXTERNAL MEDICAL & HOSPITAL REFERRALS LOG`;
  t2.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FFB91C1C' } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
  ws2.getRow(1).height = 28;

  const cols2 = ['#', 'Date', 'Student Name', 'Adm No', 'Class', 'Receiving Hospital', 'Diagnosis / Reason', 'Pre-Transfer Care', 'Clinician Attending'];
  ws2.getRow(2).values = cols2;
  ws2.getRow(2).height = 26;
  ws2.getRow(2).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };
    cell.font = headerFont;
    cell.border = borderStyle;
  });

  referrals.forEach((v, idx) => {
    const st = getStudent(v.student_id);
    const row = ws2.addRow([
      idx + 1,
      v.visit_date,
      st ? `${st.last_name}, ${st.first_name}` : '—',
      st?.admission_number || '—',
      getFormName(st?.form_id),
      v.referred_to,
      v.diagnosis || v.complaint || '—',
      v.treatment || '—',
      v.attended_by || '—',
    ]);
    row.height = 20;
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };
    });
  });

  cols2.forEach((h, idx) => {
    let max = h.length;
    ws2.getColumn(idx + 1).eachCell({ includeEmpty: false }, (cell, rowNum) => {
      if (rowNum > 1 && cell.value) {
        const len = String(cell.value).length;
        if (len > max) max = len;
      }
    });
    ws2.getColumn(idx + 1).width = Math.min(Math.max(14, max + 3), 40);
  });

  /* ─────────────────────────────────────────────────────────────
     SHEET 3: STUDENT EHR MASTER REGISTRY
  ────────────────────────────────────────────────────────────── */
  const ws3 = wb.addWorksheet('Student EHR Registry', {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  ws3.mergeCells('A1:L1');
  const t3 = ws3.getCell('A1');
  t3.value = `${schoolName} — ELECTRONIC HEALTH BASELINE & BIO REGISTRY`;
  t3.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF0F766E' } };
  t3.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
  ws3.getRow(1).height = 28;

  const cols3 = ['#', 'Student Name', 'Adm No', 'Class', 'Blood Group', 'Genotype', 'Height (cm)', 'Weight (kg)', 'BMI', 'Vision (L/R)', 'Chronic Illnesses', 'Current Medications'];
  ws3.getRow(2).values = cols3;
  ws3.getRow(2).height = 26;
  ws3.getRow(2).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.font = headerFont;
    cell.border = borderStyle;
  });

  students.forEach((st, idx) => {
    const rec = records.find((r) => r.student_id === st.id);
    const bmi =
      rec?.height_cm && rec?.weight_kg
        ? (rec.weight_kg / Math.pow(rec.height_cm / 100, 2)).toFixed(1)
        : '—';
    const vision = [rec?.vision_left, rec?.vision_right].filter(Boolean).join(' / ') || '—';

    const row = ws3.addRow([
      idx + 1,
      `${st.last_name}, ${st.first_name}`,
      st.admission_number || '—',
      getFormName(st.form_id),
      rec?.blood_group || '—',
      rec?.genotype || '—',
      rec?.height_cm || '—',
      rec?.weight_kg || '—',
      bmi,
      vision,
      rec?.chronic_conditions || 'None',
      rec?.current_medications || 'None',
    ]);
    row.height = 20;
    const isEven = idx % 2 === 1;
    row.eachCell((cell) => {
      cell.border = borderStyle;
      cell.font = { name: 'Calibri', size: 10 };
      cell.alignment = { vertical: 'middle' };
      if (isEven) cell.fill = zebraEvenFill;
    });
  });

  cols3.forEach((h, idx) => {
    let max = h.length;
    ws3.getColumn(idx + 1).eachCell({ includeEmpty: false }, (cell, rowNum) => {
      if (rowNum > 1 && cell.value) {
        const len = String(cell.value).length;
        if (len > max) max = len;
      }
    });
    ws3.getColumn(idx + 1).width = Math.min(Math.max(12, max + 3), 36);
  });

  // Download buffer
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `APSIMS_Student_Health_Clinic_Register_${Date.now()}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

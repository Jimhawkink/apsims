// ─── APSIMS Ultra Timetable — Export Utilities ─────────────────────
// Excel (CSV) + PDF export for timetables — defeats ASC export

import type { Entry, Period } from './timetable-types';
import { DAYS } from './timetable-colors';

// ── Excel / CSV Export ─────────────────────────────────────────────
export function exportTimetableToCSV(
  title: string,
  entries: Entry[],
  periods: Period[],
  getSubjectName: (id: number | null) => string,
  getTeacherName: (id: number | null) => string,
  getFormName: (id: number) => string,
  getStreamName: (id: number) => string,
  filterFn?: (e: Entry) => boolean,
): void {
  const filtered = filterFn ? entries.filter(filterFn) : entries;
  const rows: string[][] = [];

  // Header row
  rows.push(['Period', 'Time', ...DAYS]);

  periods.forEach(p => {
    const row: string[] = [p.period_name, `${p.start_time?.substring(0,5) || ''}-${p.end_time?.substring(0,5) || ''}`];
    DAYS.forEach(day => {
      const e = filtered.find(x => x.day_of_week === day && x.period_id === p.id);
      if (p.period_type !== 'lesson') {
        row.push(p.period_name);
      } else if (e && e.subject_id) {
        const subj = getSubjectName(e.subject_id);
        const teacher = getTeacherName(e.teacher_id);
        const cls = `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}`;
        row.push(`${subj} (${cls}) [${teacher}]${e.room ? ` @ ${e.room}` : ''}`);
      } else {
        row.push('');
      }
    });
    rows.push(row);
  });

  // Convert to CSV
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel UTF-8
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9 ]/g, '_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Flat export (all entries) for analysis ─────────────────────────
export function exportAllEntriesCSV(
  entries: Entry[],
  periods: Period[],
  getSubjectName: (id: number | null) => string,
  getTeacherName: (id: number | null) => string,
  getFormName: (id: number) => string,
  getStreamName: (id: number) => string,
  term: string,
  year: number,
): void {
  const te = entries.filter(e => e.term === term && e.year === year);
  const rows: string[][] = [
    ['Day', 'Period', 'Start', 'End', 'Form', 'Stream', 'Subject', 'Teacher', 'Room', 'Double', 'Term', 'Year']
  ];
  DAYS.forEach(day => {
    periods.filter(p => p.period_type === 'lesson').forEach(p => {
      const e = te.find(x => x.day_of_week === day && x.period_id === p.id);
      if (e && e.subject_id) {
        rows.push([
          day, p.period_name,
          p.start_time?.substring(0,5) || '',
          p.end_time?.substring(0,5) || '',
          getFormName(e.form_id),
          getStreamName(e.stream_id),
          getSubjectName(e.subject_id),
          getTeacherName(e.teacher_id),
          e.room || '',
          e.is_double ? 'Yes' : 'No',
          term, String(year),
        ]);
      }
    });
  });
  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `APSIMS_Timetable_All_${term}_${year}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Premium Teacher PDF Report ────────────────────────────────────
export function printPremiumTeacherReport(opts: {
  teacherName: string;
  tscNumber?: string;
  term: string;
  year: number;
  schoolName?: string;
  entries: Entry[];
  periods: Period[];
  getSubjectName: (id: number | null) => string;
  getFormName: (id: number) => string;
  getStreamName: (id: number) => string;
}): void {
  const { teacherName, tscNumber, term, year, schoolName, entries, periods, getSubjectName, getFormName, getStreamName } = opts;
  const lessonPeriods = periods.filter(p => p.period_type === 'lesson');
  const totalLessons = entries.length;
  const classes = [...new Set(entries.map(e => `${e.form_id}-${e.stream_id}`))].length;
  const subjects = [...new Set(entries.filter(e => e.subject_id).map(e => e.subject_id))];
  const loadPct = Math.round((totalLessons / (lessonPeriods.length * 5)) * 100);

  // Per-day stats
  const dayStats = DAYS.map(day => {
    const dayEntries = entries.filter(e => e.day_of_week === day);
    // Find gaps: free periods between first and last lesson of the day
    const periodIdxs = dayEntries.map(e => lessonPeriods.findIndex(p => p.id === e.period_id)).filter(i => i >= 0).sort((a,b) => a-b);
    const gaps = periodIdxs.length >= 2 ? (periodIdxs[periodIdxs.length-1] - periodIdxs[0] + 1) - periodIdxs.length : 0;
    return { day, lessons: dayEntries.length, gaps };
  });

  // Build grid HTML
  const gridRows = periods.map(p => {
    if (p.period_type !== 'lesson') {
      return `<tr><td colspan="6" style="background:#fef3c7;padding:8px;font-size:10px;font-weight:700;color:#92400e;text-align:center;border:1px solid #fcd34d">☕ ${p.period_name} &nbsp; ${p.start_time?.substring(0,5) || ''} – ${p.end_time?.substring(0,5) || ''}</td></tr>`;
    }
    const cells = DAYS.map(day => {
      const e = entries.find(x => x.day_of_week === day && x.period_id === p.id);
      if (!e || !e.subject_id) return `<td style="border:1px solid #e5e7eb;padding:6px;text-align:center;min-width:100px;color:#d1d5db;font-size:10px">—</td>`;
      const subj = getSubjectName(e.subject_id);
      const cls = `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}`;
      return `<td style="border:1px solid #e5e7eb;padding:4px;text-align:center;min-width:100px;background:#eff6ff">
        <div style="font-weight:900;font-size:11px;color:#1d4ed8">${subj}</div>
        <div style="font-size:9px;color:#6b7280;margin-top:2px">🏫 ${cls}</div>
        ${e.room ? `<div style="font-size:8px;color:#9ca3af;margin-top:1px">📍 ${e.room}</div>` : ''}
        ${e.is_double ? '<div style="font-size:8px;background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 4px;margin-top:2px;font-weight:900">2× DOUBLE</div>' : ''}
      </td>`;
    }).join('');
    return `<tr>
      <td style="background:#f8fafc;padding:8px;font-size:9px;font-weight:700;border:1px solid #e5e7eb;white-space:nowrap">
        ${p.period_name}<br><span style="font-size:8px;color:#9ca3af;font-weight:400">${p.start_time?.substring(0,5)||''} – ${p.end_time?.substring(0,5)||''}</span>
      </td>
      ${cells}
    </tr>`;
  }).join('');

  const dayStatRows = dayStats.map(d =>
    `<td style="text-align:center;padding:8px;border:1px solid #e2e8f0">
      <div style="font-weight:900;font-size:16px;color:#1e293b">${d.lessons}</div>
      <div style="font-size:8px;color:#94a3b8">${d.gaps > 0 ? `${d.gaps} gap${d.gaps>1?'s':''}` : '✓ no gaps'}</div>
    </td>`
  ).join('');

  const subjectList = subjects.map(sid => {
    const n = getSubjectName(sid);
    const cnt = entries.filter(e => e.subject_id === sid).length;
    return `<span style="display:inline-block;background:#dbeafe;color:#1e40af;border:1px solid #bfdbfe;border-radius:6px;padding:3px 8px;font-size:9px;font-weight:700;margin:2px">${n} (${cnt})</span>`;
  }).join('');

  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><title>${teacherName} — Timetable Report</title>
  <style>
    @page{size:A4 landscape;margin:10mm}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',system-ui,sans-serif;background:#fff;color:#0f172a;padding:15px}
    table{border-collapse:collapse;width:100%}
    h1{font-size:22px;font-weight:900;color:#1e3a8a}
    .stat{display:inline-block;background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:8px 14px;margin:3px;text-align:center}
    .stat-val{font-size:24px;font-weight:900;color:#0369a1}
    .stat-lbl{font-size:9px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style>
  </head><body>
  <div style="border-bottom:4px solid #1e3a8a;padding-bottom:12px;margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>
        <h1>📋 Teacher Timetable Report</h1>
        <p style="font-size:13px;color:#64748b;margin-top:4px">${schoolName || 'APSIMS School'} &nbsp;|&nbsp; ${term} ${year}</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:20px;font-weight:900;color:#1e3a8a">👤 ${teacherName}</div>
        ${tscNumber ? `<div style="font-size:11px;color:#64748b">TSC No: ${tscNumber}</div>` : ''}
        <div style="font-size:10px;color:#94a3b8;margin-top:2px">Generated: ${new Date().toLocaleDateString('en-KE',{weekday:'short',day:'numeric',month:'long',year:'numeric'})}</div>
      </div>
    </div>
  </div>

  <!-- Stats -->
  <div style="margin-bottom:14px">
    <div class="stat"><div class="stat-val">${totalLessons}</div><div class="stat-lbl">Lessons/week</div></div>
    <div class="stat"><div class="stat-val">${classes}</div><div class="stat-lbl">Classes</div></div>
    <div class="stat"><div class="stat-val">${subjects.length}</div><div class="stat-lbl">Subjects</div></div>
    <div class="stat"><div class="stat-val">${loadPct}%</div><div class="stat-lbl">Workload</div></div>
    <div class="stat"><div class="stat-val">${lessonPeriods.length * 5 - totalLessons}</div><div class="stat-lbl">Free periods</div></div>
  </div>

  <!-- Day breakdown -->
  <table style="margin-bottom:14px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
    <thead><tr>
      <th style="background:#1e293b;color:#fff;padding:8px;font-size:10px;text-align:left">Day Load</th>
      ${DAYS.map(d=>`<th style="background:#1e3a8a;color:#fff;padding:8px;font-size:10px;text-align:center">${d}</th>`).join('')}
    </tr></thead>
    <tbody><tr><td style="padding:8px;font-size:9px;font-weight:700;color:#64748b;border:1px solid #e2e8f0">Lessons / Gaps</td>${dayStatRows}</tr></tbody>
  </table>

  <!-- Weekly grid -->
  <table style="margin-bottom:14px">
    <thead><tr>
      <th style="background:#0f172a;color:#fff;padding:10px;font-size:10px;text-align:left;min-width:80px">Period</th>
      ${DAYS.map(d=>`<th style="background:linear-gradient(135deg,#1e40af,#3730a3);color:#fff;padding:10px;font-size:10px;text-align:center">${d}</th>`).join('')}
    </tr></thead>
    <tbody>${gridRows}</tbody>
  </table>

  <!-- Subject tags -->
  <div style="margin-top:10px;padding:10px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0">
    <div style="font-size:9px;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:6px">Subjects Taught</div>
    ${subjectList}
  </div>
  </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}

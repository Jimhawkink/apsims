'use client';
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { FiUpload, FiDownload, FiX, FiCheckCircle, FiAlertCircle, FiZap, FiFileText, FiRefreshCw } from 'react-icons/fi';
import { getSubjectById } from '@/data/cbc-senior-data';

const RUBRIC_CFG = [
  { code: 'EE', label: 'Exceeds Expectation',    min: 80, max: 100, color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  { code: 'ME', label: 'Meets Expectation',       min: 60, max: 79,  color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  { code: 'AE', label: 'Approaches Expectation',  min: 40, max: 59,  color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  { code: 'BE', label: 'Below Expectation',        min: 0,  max: 39,  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
] as const;

function getRubric(score: number) {
  return RUBRIC_CFG.find(r => score >= r.min && score <= r.max) || RUBRIC_CFG[3];
}
function scoreToRubric(score: number): string {
  if (score >= 80) return 'EE';
  if (score >= 60) return 'ME';
  if (score >= 40) return 'AE';
  return 'BE';
}

type ImportStep = { id: string; label: string; status: 'waiting' | 'running' | 'done' | 'error'; count?: number };

// Per-strand parsed data for a student
type StrandMark = { strandId: string; strandName: string; score: number; rubric: string };
type ParsedRow = {
  studentName: string;
  admNo: string;
  stream: string;
  studentId: number | null;
  strandMarks: StrandMark[];       // Senior per-strand
  marks: Record<string, number>;   // JSS fallback (laCode → score)
  rubrics: Record<string, string>;
  overallAvg: number | null;
  overallRubric: string | null;
  errors: string[];
};

interface Props {
  open: boolean;
  onClose: () => void;
  students: any[];
  learningAreas: any[];    // JSS: [{code,name}], Senior: strands from subject
  streams?: any[];
  selStream?: string;
  selAssessmentType?: string;
  onImportDone: (results: Record<string, Record<string, { score: string; level: string }>>) => void;
  termName?: string;
  gradeName?: string;
  subjectName?: string;
  /** The subject selector value from hook.selSubject (string ID like "11") */
  selSubject?: string;
  isSenior?: boolean;
}

export default function CBCImportModal({
  open, onClose, students, learningAreas, streams = [], selStream = '',
  selAssessmentType = 'Summative', onImportDone, termName, gradeName, subjectName,
  selSubject = '', isSenior = false,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'idle' | 'preview' | 'processing' | 'done'>('idle');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [steps, setSteps] = useState<ImportStep[]>([]);
  const [error, setError] = useState('');
  const [rubricStats, setRubricStats] = useState({ EE: 0, ME: 0, AE: 0, BE: 0 });

  const streamMap: Record<string, string> = {};
  streams.forEach(s => { streamMap[String(s.id)] = s.stream_name || s.name || ''; });
  const activeStream = selStream ? (streamMap[selStream] || 'All Streams') : 'All Streams';

  // Get CBC Senior strands for the subject (if Senior mode)
  const subjectData = isSenior ? getSubjectById(selSubject) : null;
  const seniorStrands = subjectData?.strands ?? [];

  // Columns to use: Senior → strands, JSS → learningAreas
  const columns = isSenior
    ? seniorStrands.map(s => ({ code: s.id, name: s.name }))
    : learningAreas.map(l => ({ code: l.code || l.id, name: l.name }));

  // ─── Download Template ────────────────────────────────────────────────────────
  const downloadTemplate = useCallback(() => {
    const filteredStudents = selStream
      ? students.filter(s => String(s.stream_id) === selStream)
      : students;

    const subject = subjectName || columns.map(c => c.name).join(' | ');
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // ── Info block rows (7 rows before header) ──
    const infoRows: any[][] = [
      ['CBC MARKS ENTRY TEMPLATE', '', '', '', '', '', ...columns.map(() => '')],
      ['School:', 'APSIMS School', '', '', '', '', ...columns.map(() => '')],
      ['Grade / Form:', gradeName || '—', '', 'Subject:', subject, '', ...columns.map(() => '')],
      ['Stream:', activeStream, '', 'Term:', termName || '—', '', ...columns.map(() => '')],
      ['Assessment Type:', selAssessmentType, '', 'Date:', dateStr, '', ...columns.map(() => '')],
      ['KICD Rubric Scale:', 'EE = 80-100 (Exceeds Expectation)', 'ME = 60-79 (Meets Expectation)', 'AE = 40-59 (Approaches Expectation)', 'BE = 0-39 (Below Expectation)', '', ...columns.map(() => '')],
      ['', '', '', '', '', '', ...columns.map(() => '')],  // blank separator
    ];

    // ── Column headers ──
    const headerRow = [
      '#', 'Admission No', 'Student Name', 'Stream', 'Gender', 'Pathway',
      ...columns.map(c => `${c.name} (0-100)`),
      'Overall Avg (Auto)',
      ...columns.map(c => `Rubric: ${c.code}`),
    ];

    // ── Student rows ──
    const studentRows = filteredStudents.map((s: any, i: number) => {
      const colStart = 7; // 1-indexed: cols A-F are info cols, then marks start at G (index 6, excel col 7)
      const admNo = s.admission_no || s.admission_number || '';
      const pathway = s.pathway_preference || '';
      const streamName = streamMap[String(s.stream_id)] || '';
      const gender = s.gender || '';

      // Mark score columns (columns G onwards, 1-indexed = colStart to colStart+columns.length-1)
      const markColLetters = columns.map((_, ci) => {
        const colNum = colStart + ci; // 1-based
        return XLSX.utils.encode_col(colNum - 1); // 0-based for encode_col
      });

      // Overall avg formula = AVERAGE(G{row}:X{row})
      const dataRow = i + 9; // row number in excel (1-indexed): 7 info + 1 header + 1-based
      const firstMarkCol = markColLetters[0];
      const lastMarkCol = markColLetters[markColLetters.length - 1];
      const avgFormula = columns.length > 0
        ? { f: `IFERROR(ROUND(AVERAGE(${firstMarkCol}${dataRow}:${lastMarkCol}${dataRow}),0),0)` }
        : '';

      // Auto-rubric formula for overall
      const overallCol = XLSX.utils.encode_col(colStart + columns.length - 1); // 0-based
      const overallFormula = {
        f: `IF(${overallCol}${dataRow}>=80,"EE",IF(${overallCol}${dataRow}>=60,"ME",IF(${overallCol}${dataRow}>=40,"AE",IF(${overallCol}${dataRow}>0,"BE",""))))`,
      };

      const row: any[] = [
        i + 1, admNo, `${s.last_name}, ${s.first_name}`.trim(), streamName, gender, pathway,
        ...columns.map(() => ''),  // blank mark cells for teacher to fill
        avgFormula,
        ...columns.map(() => overallFormula),
      ];

      return row;
    });

    // ── Assemble workbook ──
    const allRows = [...infoRows, headerRow, ...studentRows];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // Column widths
    ws['!cols'] = [
      { wch: 4 }, { wch: 16 }, { wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 20 },
      ...columns.map(() => ({ wch: 16 })),
      { wch: 14 },
      ...columns.map(() => ({ wch: 12 })),
    ];

    // ── Instructions sheet ──
    const instrWs = XLSX.utils.aoa_to_sheet([
      ['CBC MARKS ENTRY — INSTRUCTIONS'],
      [''],
      ['1. Do NOT change column headers or add/remove columns'],
      ['2. Do NOT change student names or admission numbers'],
      ['3. Enter marks as numbers 0-100 in the strand mark columns'],
      ['4. Leave blank if not assessed — do NOT enter 0 unless the student truly scored 0'],
      ['5. Overall Average is auto-calculated from all strand marks'],
      ['6. KICD Rubric Scale:'],
      ['   EE (Exceeds Expectation):    80 – 100'],
      ['   ME (Meets Expectation):      60 – 79'],
      ['   AE (Approaches Expectation): 40 – 59'],
      ['   BE (Below Expectation):       0 – 39'],
      [''],
      ['7. Save as .xlsx and use the Import button to upload'],
      [''],
      ['Strand Columns:'],
      ...columns.map((c, i) => [`   Strand ${i + 1}: ${c.name} (Code: ${c.code})`]),
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Marks Entry');
    XLSX.utils.book_append_sheet(wb, instrWs, 'Instructions');

    const safeSubject = (subjectName || 'CBC').replace(/[^a-zA-Z0-9]/g, '_');
    const safeGrade = (gradeName || 'Grade').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `CBC_${safeSubject}_${safeGrade}_${selAssessmentType}_Marks.xlsx`);
  }, [students, streams, selStream, gradeName, subjectName, termName, selAssessmentType, activeStream, columns, streamMap]);

  // ─── Parse uploaded file ──────────────────────────────────────────────────────
  const parseFile = useCallback((file: File) => {
    setError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary', cellFormula: false, cellNF: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });

        // Skip 7 info rows + 1 header = start from row index 8 (0-based)
        const INFO_ROWS = 7;
        const headerRow: any[] = allRows[INFO_ROWS] || [];
        const dataRows = allRows.slice(INFO_ROWS + 1);

        if (dataRows.length === 0) { setError('No student data found. Make sure you used the downloaded template.'); return; }

        // Find column indices from header
        const admNoIdx = headerRow.findIndex((h: any) => String(h).toLowerCase().includes('admission'));
        const nameIdx = headerRow.findIndex((h: any) => String(h).toLowerCase().includes('student name'));

        // Find strand/LA mark column indices
        // For Senior: header cell contains strand name or "(0-100)"
        // For JSS: header cell contains LA name
        const colIndices: { code: string; name: string; idx: number }[] = [];
        columns.forEach(col => {
          const idx = headerRow.findIndex((h: any) => {
            const hStr = String(h).toLowerCase();
            return hStr.includes(col.name.toLowerCase()) || hStr.includes(col.code.toLowerCase());
          });
          if (idx >= 0) colIndices.push({ code: col.code, name: col.name, idx });
        });

        // Build admission → student map
        const admMap: Record<string, any> = {};
        const nameMap: Record<string, any> = {};
        students.forEach(s => {
          const adm = (s.admission_no || s.admission_number || '').trim().toLowerCase();
          if (adm) admMap[adm] = s;
          const name = `${s.last_name} ${s.first_name}`.toLowerCase();
          nameMap[name] = s;
        });

        const parsed: ParsedRow[] = [];
        const stats = { EE: 0, ME: 0, AE: 0, BE: 0 };

        dataRows.forEach((row: any[]) => {
          if (!row || row.every(c => c === '' || c === null || c === undefined)) return;

          const admRaw = admNoIdx >= 0 ? String(row[admNoIdx] ?? '').trim() : '';
          const nameRaw = nameIdx >= 0 ? String(row[nameIdx] ?? '').trim() : '';

          let student = admMap[admRaw.toLowerCase()] || nameMap[nameRaw.toLowerCase()];

          const strandMarks: StrandMark[] = [];
          const marks: Record<string, number> = {};
          const rubrics: Record<string, string> = {};
          const errors: string[] = [];

          colIndices.forEach(({ code, name, idx }) => {
            const raw = row[idx];
            if (raw === '' || raw === null || raw === undefined) return;
            const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
            if (isNaN(num)) return;
            const clamped = Math.min(Math.max(Math.round(num), 0), 100);
            const rubric = scoreToRubric(clamped);
            strandMarks.push({ strandId: code, strandName: name, score: clamped, rubric });
            marks[code] = clamped;
            rubrics[code] = rubric;
            stats[rubric as keyof typeof stats]++;
          });

          const overallAvg = strandMarks.length > 0
            ? Math.round(strandMarks.reduce((a, b) => a + b.score, 0) / strandMarks.length)
            : null;
          const overallRubric = overallAvg !== null ? scoreToRubric(overallAvg) : null;

          parsed.push({
            studentName: nameRaw || (student ? `${student.last_name}, ${student.first_name}` : '—'),
            admNo: admRaw,
            stream: '',
            studentId: student ? student.id : null,
            strandMarks,
            marks,
            rubrics,
            overallAvg,
            overallRubric,
            errors,
          });
        });

        setRubricStats(stats);
        setParsedRows(parsed.filter(r => r.strandMarks.length > 0));
        setPhase('preview');
      } catch (err: any) {
        setError('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  }, [students, columns]);

  // ─── Handle file drop / select ────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) { setError('Please upload an Excel file (.xlsx or .xls)'); return; }
    setFileName(file.name);
    parseFile(file);
  }, [parseFile]);

  // ─── Commit import ────────────────────────────────────────────────────────────
  const commitImport = useCallback(async () => {
    setPhase('processing');
    const stepList: ImportStep[] = [
      { id: 'match', label: 'Matching students by Admission No', status: 'running' },
      { id: 'strands', label: 'Reading per-strand scores', status: 'waiting' },
      { id: 'rubric', label: 'Auto-assigning KICD rubric levels', status: 'waiting' },
      { id: 'load', label: 'Loading into grade book', status: 'waiting' },
    ];
    setSteps(stepList);

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    const updateStep = (id: string, status: ImportStep['status'], count?: number) => {
      setSteps(prev => prev.map(s => s.id === id ? { ...s, status, count } : s));
    };

    await delay(400);
    const matched = parsedRows.filter(r => r.studentId !== null);
    updateStep('match', 'done', matched.length);

    await delay(300);
    updateStep('strands', 'running');
    const totalStrands = parsedRows.reduce((a, r) => a + r.strandMarks.length, 0);
    await delay(400);
    updateStep('strands', 'done', totalStrands);

    await delay(300);
    updateStep('rubric', 'running');
    await delay(400);
    updateStep('rubric', 'done', matched.length);

    await delay(300);
    updateStep('load', 'running');

    // Build result map: studentId → { strandId → { score, level } }
    const resultMap: Record<string, Record<string, { score: string; level: string }>> = {};
    matched.forEach(row => {
      if (!row.studentId) return;
      const sid = String(row.studentId);
      resultMap[sid] = {};
      row.strandMarks.forEach(sm => {
        resultMap[sid][sm.strandId] = { score: String(sm.score), level: sm.rubric };
      });
    });

    await delay(300);
    updateStep('load', 'done', Object.keys(resultMap).length);
    setPhase('done');

    setTimeout(() => {
      onImportDone(resultMap);
    }, 600);
  }, [parsedRows, onImportDone]);

  const reset = () => {
    setPhase('idle');
    setFileName('');
    setParsedRows([]);
    setSteps([]);
    setError('');
    if (fileRef.current) fileRef.current.value = '';
  };

  if (!open) return null;

  const totalMapped = parsedRows.filter(r => r.studentId !== null).length;
  const unmapped = parsedRows.filter(r => r.studentId === null).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col"
        style={{ border: '1.5px solid rgba(99,102,241,0.15)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8,#4f46e5)' }}>
          <div>
            <h2 className="text-xl font-black text-white">📥 Import CBC Marks from Excel</h2>
            <p className="text-blue-200 text-xs mt-0.5">
              {isSenior ? `Per-strand entry • ${columns.length} strands` : 'JSS Learning Areas'} •{' '}
              {subjectName} • {gradeName} • {termName}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition">
            <FiX size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-7">

          {/* KICD Rubric legend */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {RUBRIC_CFG.map(r => (
              <span key={r.code} className="px-3 py-1.5 rounded-xl text-xs font-black"
                style={{ background: r.bg, color: r.color, border: `1.5px solid ${r.border}` }}>
                {r.code}: {r.min}–{r.max} — {r.label}
              </span>
            ))}
          </div>

          {/* Strand column info */}
          {isSenior && columns.length > 0 && (
            <div className="mb-5 p-4 rounded-2xl border border-indigo-100 bg-indigo-50">
              <p className="text-xs font-black text-indigo-700 mb-2">📐 Strand Columns in Template:</p>
              <div className="flex flex-wrap gap-2">
                {columns.map((c, i) => (
                  <span key={c.code} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white border border-indigo-200 text-indigo-700">
                    {i + 1}. {c.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Download Template button */}
          <button onClick={downloadTemplate}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl font-black text-sm mb-5 transition-all hover:scale-[1.02] active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', color: '#fff', boxShadow: '0 4px 20px rgba(29,78,216,0.35)' }}>
            <FiDownload size={16} />
            Download Template with Strand Columns ({columns.length} strands • {students.length} students)
          </button>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 mb-5">
              <FiAlertCircle className="text-red-500 flex-shrink-0" size={18} />
              <p className="text-sm text-red-700 font-semibold">{error}</p>
            </div>
          )}

          {/* Upload zone */}
          {phase === 'idle' && (
            <div
              className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50/30"
              style={{ borderColor: '#c7d2fe' }}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => fileRef.current?.click()}>
              <FiUpload size={32} className="mx-auto mb-3 text-indigo-300" />
              <p className="font-black text-gray-700">Drop your filled Excel file here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse — .xlsx / .xls only</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </div>
          )}

          {/* Preview */}
          {phase === 'preview' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FiFileText className="text-indigo-500" size={20} />
                  <div>
                    <p className="font-black text-gray-800 text-sm">{fileName}</p>
                    <p className="text-xs text-gray-500">{parsedRows.length} students parsed • {totalMapped} matched • {unmapped} unmatched</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {RUBRIC_CFG.map(r => (
                    <span key={r.code} className="px-2 py-1 rounded-lg text-[10px] font-black"
                      style={{ background: r.bg, color: r.color }}>{r.code}: {rubricStats[r.code as keyof typeof rubricStats]}</span>
                  ))}
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-auto max-h-72 rounded-2xl border border-gray-200 mb-5">
                <table className="w-full text-xs">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-black text-white text-[10px]"
                        style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>Student</th>
                      <th className="px-2 py-2 text-left font-black text-white text-[10px]"
                        style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>Adm No</th>
                      {columns.map(c => (
                        <th key={c.code} className="px-2 py-2 text-center font-black text-white text-[10px]"
                          style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)' }}>{c.name.split(' ')[0]}</th>
                      ))}
                      <th className="px-2 py-2 text-center font-black text-white text-[10px]"
                        style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>Avg</th>
                      <th className="px-2 py-2 text-center font-black text-white text-[10px]"
                        style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>Overall</th>
                      <th className="px-2 py-2 text-center font-black text-white text-[10px]"
                        style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, i) => {
                      const or = row.overallRubric ? RUBRIC_CFG.find(r => r.code === row.overallRubric) : null;
                      return (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}>
                          <td className="px-3 py-2 font-semibold text-gray-800">{row.studentName}</td>
                          <td className="px-2 py-2 text-gray-500">{row.admNo}</td>
                          {columns.map(c => {
                            const sm = row.strandMarks.find(s => s.strandId === c.code);
                            const r = sm ? RUBRIC_CFG.find(r => r.code === sm.rubric) : null;
                            return (
                              <td key={c.code} className="px-2 py-2 text-center">
                                {sm ? (
                                  <span className="font-black text-xs px-1.5 py-0.5 rounded-lg"
                                    style={{ background: r?.bg, color: r?.color }}>{sm.score}</span>
                                ) : <span className="text-gray-200">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center font-black text-sm" style={{ color: or?.color ?? '#9ca3af' }}>
                            {row.overallAvg ?? '—'}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {or ? (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full"
                                style={{ background: or.bg, color: or.color }}>{or.code}</span>
                            ) : <span className="text-gray-200 text-xs">—</span>}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {row.studentId
                              ? <span className="text-green-600 text-[10px] font-black">✓ Matched</span>
                              : <span className="text-red-500 text-[10px] font-bold">✗ Not found</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {unmapped > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                  <FiAlertCircle className="text-amber-500 flex-shrink-0 mt-0.5" size={14} />
                  <p className="text-xs text-amber-700"><span className="font-black">{unmapped} student(s)</span> could not be matched by Admission No or Name — they will be skipped.</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-black text-sm text-gray-600 hover:border-gray-300 transition">
                  Upload Different File
                </button>
                <button onClick={commitImport} disabled={totalMapped === 0}
                  className="flex-1 py-3 rounded-2xl font-black text-sm text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}>
                  <FiZap className="inline mr-2" size={14} />
                  Import {totalMapped} Students — {columns.length} Strands Each
                </button>
              </div>
            </div>
          )}

          {/* Processing steps */}
          {(phase === 'processing' || phase === 'done') && (
            <div>
              <div className="space-y-3 mb-6">
                {steps.map(step => (
                  <div key={step.id} className="flex items-center gap-3 p-3.5 rounded-2xl border"
                    style={{
                      background: step.status === 'done' ? '#f0fdf4' : step.status === 'running' ? '#eff6ff' : '#f8faff',
                      borderColor: step.status === 'done' ? '#bbf7d0' : step.status === 'running' ? '#bfdbfe' : '#e2e8f0',
                    }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: step.status === 'done' ? '#dcfce7' : step.status === 'running' ? '#dbeafe' : '#f1f5f9' }}>
                      {step.status === 'done' && <FiCheckCircle className="text-green-500" size={16} />}
                      {step.status === 'running' && <FiRefreshCw className="text-blue-500 animate-spin" size={16} />}
                      {step.status === 'waiting' && <span className="w-3 h-3 rounded-full bg-gray-200" />}
                      {step.status === 'error' && <FiAlertCircle className="text-red-500" size={16} />}
                    </div>
                    <span className="font-semibold text-sm text-gray-700">{step.label}</span>
                    {step.count !== undefined && <span className="ml-auto text-xs font-black text-gray-500">{step.count}</span>}
                  </div>
                ))}
              </div>
              {phase === 'done' && (
                <div className="text-center py-4">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="font-black text-gray-800 text-lg">Import Complete!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {totalMapped} students × {columns.length} strands loaded into grade book. Saving to database…
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

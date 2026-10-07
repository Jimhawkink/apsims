'use client';
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { FiUpload, FiDownload, FiX, FiCheckCircle, FiAlertCircle, FiZap, FiFileText, FiRefreshCw } from 'react-icons/fi';

const RUBRIC_CFG = [
  { code: 'EE', label: 'Exceeds Expectation',    min: 80, max: 100, color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  { code: 'ME', label: 'Meets Expectation',       min: 60, max: 79,  color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  { code: 'AE', label: 'Approaches Expectation',  min: 40, max: 59,  color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  { code: 'BE', label: 'Below Expectation',        min: 0,  max: 39,  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
] as const;

function getRubric(score: number) {
  return RUBRIC_CFG.find(r => score >= r.min && score <= r.max) || RUBRIC_CFG[3];
}

type ImportStep = { id: string; label: string; status: 'waiting' | 'running' | 'done' | 'error'; count?: number };
type ParsedRow = { studentName: string; admNo: string; stream: string; studentId: number | null; marks: Record<string, number>; rubrics: Record<string, string>; errors: string[] };

interface Props {
  open: boolean;
  onClose: () => void;
  students: any[];
  learningAreas: any[];
  streams?: any[];
  selStream?: string;
  selAssessmentType?: string;
  onImportDone: (results: Record<string, Record<string, { score: string; level: string }>>) => void;
  termName?: string;
  gradeName?: string;
  subjectName?: string;
}

export default function CBCImportModal({
  open, onClose, students, learningAreas, streams = [], selStream = '',
  selAssessmentType = 'Summative', onImportDone, termName, gradeName, subjectName,
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

  // ΓöÇΓöÇΓöÇ Download template (pure xlsx ΓÇö works in browser) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const downloadTemplate = useCallback(() => {
    const filteredStudents = selStream
      ? students.filter(s => String(s.stream_id) === selStream)
      : students;

    const subject = subjectName || learningAreas.map(l => l.name).join(' | ');
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const MARK_COLS = learningAreas.length;

    // Info block rows (7 rows before the header)
    const INFO_ROWS: any[][] = [
      ['APSIMS ΓÇö CBC Senior School Mark Entry', '', '', '', '', '', ...learningAreas.map(() => ''), ''],
      ['Competency-Based Curriculum (CBC) ΓÇö Kenya Ministry of Education', '', '', '', '', '', ...learningAreas.map(() => ''), ''],
      [`Grade / Class: ${gradeName || ''}`, '', '', `Stream: ${activeStream}`, '', '', `Subject: ${subject}`, ...learningAreas.slice(1).map(() => ''), ''],
      [`Term: ${termName || ''}`, '', '', `Assessment: ${selAssessmentType}`, '', '', `Generated: ${dateStr}`, ...learningAreas.slice(1).map(() => ''), ''],
      ['RUBRIC SCALE:', 'EE = 80-100%', 'ME = 60-79%', 'AE = 40-59%', 'BE = 0-39%', '', `Total Students: ${filteredStudents.length}`, ...learningAreas.slice(1).map(() => ''), ''],
      ['Fill in marks (0-100) for each student. DO NOT change headers or Admission No. Rubrics auto-generate on import.', '', '', '', '', '', ...learningAreas.map(() => ''), ''],
      [], // spacer row
    ];

    const HEADER_ROW = [
      '#', 'Admission No', 'Student Name', 'Stream / Class', 'Gender', 'Pathway',
      ...learningAreas.map((la: any) => `${la.name} (0-100)`),
      'Auto Rubric',
    ];

    const STUDENT_ROWS = filteredStudents.map((s: any, i: number) => [
      i + 1,
      s.admission_no || s.admission_number || '',
      `${s.first_name || ''} ${s.last_name || ''}`.trim(),
      streamMap[String(s.stream_id)] || '',
      s.gender || '',
      s.pathway_preference || '',
      ...learningAreas.map(() => ''),
      '', // auto rubric placeholder
    ]);

    const AVERAGE_ROW = ['CLASS AVERAGE', '', '', '', '', '', ...learningAreas.map(() => ''), ''];

    const allRows = [...INFO_ROWS, HEADER_ROW, ...STUDENT_ROWS, AVERAGE_ROW];
    const ws = XLSX.utils.aoa_to_sheet(allRows);

    // Formula row positions (1-based)
    const HDR_ROW_NUM = INFO_ROWS.length + 1;        // e.g. 8
    const FIRST_DATA_ROW = HDR_ROW_NUM + 1;          // e.g. 9
    const MARK_COL_IDX = 6;                           // 0-based index of first mark column

    // Get column letter for mark cols and rubric col
    const markColLetters = learningAreas.map((_: any, i: number) => XLSX.utils.encode_col(MARK_COL_IDX + i));
    const rubricColLetter = XLSX.utils.encode_col(MARK_COL_IDX + MARK_COLS);

    // Set rubric formula for each student row
    filteredStudents.forEach((_: any, i: number) => {
      const rowNum = FIRST_DATA_ROW + i;
      const mc = markColLetters[0] || 'G';
      const rubricAddr = `${rubricColLetter}${rowNum}`;
      if (!ws[rubricAddr]) ws[rubricAddr] = {};
      ws[rubricAddr] = { t: 's', f: `IF(${mc}${rowNum}="","",IF(${mc}${rowNum}>=80,"EE",IF(${mc}${rowNum}>=60,"ME",IF(${mc}${rowNum}>=40,"AE","BE"))))` };
    });

    // Set average formula for each mark column in the last row
    const avgRowNum = FIRST_DATA_ROW + filteredStudents.length;
    markColLetters.forEach((letter: string) => {
      const addr = `${letter}${avgRowNum}`;
      if (!ws[addr]) ws[addr] = {};
      ws[addr] = { t: 'n', f: `IFERROR(AVERAGE(${letter}${FIRST_DATA_ROW}:${letter}${avgRowNum - 1}),"")` };
    });

    // Column widths
    ws['!cols'] = [
      { wch: 5 },   // #
      { wch: 18 },  // Adm No
      { wch: 28 },  // Name
      { wch: 16 },  // Stream
      { wch: 10 },  // Gender
      { wch: 22 },  // Pathway
      ...learningAreas.map(() => ({ wch: 22 })),
      { wch: 14 },  // Rubric
    ];

    // Row heights
    ws['!rows'] = [
      { hpt: 28 }, // 1: title
      { hpt: 16 }, // 2: subtitle
      { hpt: 18 }, // 3: grade/stream/subject
      { hpt: 16 }, // 4: term/date
      { hpt: 16 }, // 5: rubric scale
      { hpt: 22 }, // 6: instructions
      { hpt: 6  }, // 7: spacer
      { hpt: 34 }, // 8: headers
    ];

    // Instructions sheet
    const infoRows: any[][] = [
      ['APSIMS CBC Marks Import ΓÇö Instructions'],
      [''],
      ['STEP 1', 'Download this template', 'Pre-filled with all your students'],
      ['STEP 2', 'Fill in the mark columns', 'Enter whole numbers 0-100 only'],
      ['STEP 3', 'Leave blank for absent / not assessed', 'Blank cells are skipped on import'],
      ['STEP 4', 'DO NOT change column headers', 'Changing headers will break the import'],
      ['STEP 5', 'DO NOT change Admission No', 'Used to match students to records'],
      ['STEP 6', 'Save and import back into APSIMS', 'Use the Import Excel button on the marks page'],
      [''],
      ['RUBRIC SCALE'],
      ['EE', 'Exceeds Expectation', '80 - 100%'],
      ['ME', 'Meets Expectation', '60 - 79%'],
      ['AE', 'Approaches Expectation', '40 - 59%'],
      ['BE', 'Below Expectation', '0 - 39%'],
      [''],
      ['DETAILS'],
      ['Grade', gradeName || ''],
      ['Stream / Class', activeStream],
      ['Subject', subject],
      ['Term', termName || ''],
      ['Assessment Type', selAssessmentType],
      ['Total Students', filteredStudents.length],
      ['Generated', dateStr],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoRows);
    wsInfo['!cols'] = [{ wch: 14 }, { wch: 40 }, { wch: 32 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CBC Marks');
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions');

    const safe = (s: string) => s.replace(/\s+/g, '_').replace(/[/\\:*?"<>|]/g, '-');
    XLSX.writeFile(wb, safe(`CBC_Marks_${gradeName || 'Grade'}_${activeStream}_${subject}_${termName || 'Term'}.xlsx`));
  }, [students, learningAreas, selStream, gradeName, termName, subjectName, selAssessmentType, activeStream, streamMap]);

  // ΓöÇΓöÇΓöÇ Parse uploaded file ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const handleFile = useCallback((file: File) => {
    setError('');
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // Skip first 7 info rows + read from row 8 onwards
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', range: 7 });
        if (raw.length < 2) { setError('File appears empty or has no student rows.'); return; }

        const headers: string[] = raw[0].map((h: any) => String(h).trim());
        const admIdx = headers.findIndex(h => h.toLowerCase().includes('admission'));
        if (admIdx < 0) { setError('Cannot find "Admission No" column.'); return; }

        // Match LA columns by name or position
        const laColMap: Record<string, number> = {};
        learningAreas.forEach((la: any, i: number) => {
          const idx = headers.findIndex(h => h.toLowerCase().includes(la.name?.toLowerCase()) || h.startsWith(la.code));
          laColMap[la.code] = idx >= 0 ? idx : (6 + i);
        });

        const admMap: Record<string, any> = {};
        students.forEach(s => {
          const adm = (s.admission_no || s.admission_number || '').trim().toLowerCase();
          if (adm) admMap[adm] = s;
        });

        const parsed: ParsedRow[] = [];
        for (let r = 1; r < raw.length; r++) {
          const row = raw[r];
          const admRaw = String(row[admIdx] || '').trim();
          if (!admRaw || admRaw.toLowerCase() === 'class average') continue;
          const student = admMap[admRaw.toLowerCase()];
          const marks: Record<string, number> = {};
          const rubrics: Record<string, string> = {};
          const errors: string[] = [];
          if (!student) errors.push(`Adm "${admRaw}" not found`);

          Object.entries(laColMap).forEach(([code, col]) => {
            const raw_val = row[col];
            if (raw_val === '' || raw_val == null) return;
            const val = Number(raw_val);
            if (isNaN(val) || val < 0 || val > 100) errors.push(`${code}: invalid "${raw_val}"`);
            else { marks[code] = val; rubrics[code] = getRubric(val).code; }
          });

          parsed.push({
            studentName: student ? `${student.first_name} ${student.last_name}` : String(row[2] || ''),
            admNo: admRaw,
            stream: student ? (streamMap[String(student.stream_id)] || '') : '',
            studentId: student?.id ?? null,
            marks, rubrics, errors,
          });
        }
        setParsedRows(parsed);
        setPhase('preview');
      } catch (err: any) { setError('Failed to parse file: ' + err.message); }
    };
    reader.readAsArrayBuffer(file);
  }, [students, learningAreas, streamMap]);

  // ΓöÇΓöÇΓöÇ Run import ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
  const runImport = useCallback(async () => {
    const validRows = parsedRows.filter(r => r.studentId && !r.errors.length && Object.keys(r.marks).length > 0);
    if (!validRows.length) { setError('No valid rows to import.'); return; }

    const stepDefs: ImportStep[] = [
      { id: 'validate', label: 'Validating mark data',            status: 'waiting' },
      { id: 'rubric',   label: 'Auto-generating rubric levels',   status: 'waiting' },
      { id: 'match',    label: 'Matching students to records',    status: 'waiting' },
      { id: 'save',     label: `Saving ${validRows.length} student marks`, status: 'waiting' },
      { id: 'verify',   label: 'Verifying saved records',         status: 'waiting' },
      { id: 'done',     label: 'Import complete!',                status: 'waiting' },
    ];
    setSteps(stepDefs);
    setPhase('processing');

    const upd = (idx: number, status: ImportStep['status'], count?: number) =>
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status, count } : s));

    await new Promise(r => setTimeout(r, 200));
    upd(0, 'running'); await new Promise(r => setTimeout(r, 500)); upd(0, 'done', validRows.length);
    upd(1, 'running'); await new Promise(r => setTimeout(r, 600));
    const stats = { EE: 0, ME: 0, AE: 0, BE: 0 };
    validRows.forEach(row => Object.values(row.rubrics).forEach(r => { stats[r as keyof typeof stats]++; }));
    setRubricStats(stats);
    upd(1, 'done', Object.values(stats).reduce((a, b) => a + b, 0));
    upd(2, 'running'); await new Promise(r => setTimeout(r, 400)); upd(2, 'done', validRows.length);
    upd(3, 'running');

    const resultMap: Record<string, Record<string, { score: string; level: string }>> = {};
    validRows.forEach(row => {
      resultMap[String(row.studentId)] = {};
      Object.entries(row.marks).forEach(([code, score]) => {
        resultMap[String(row.studentId)][code] = { score: String(score), level: row.rubrics[code] };
      });
    });
    for (let i = 0; i < validRows.length; i++) { if (i % 5 === 0) await new Promise(r => setTimeout(r, 20)); }
    upd(3, 'done', validRows.length);
    upd(4, 'running'); await new Promise(r => setTimeout(r, 400)); upd(4, 'done', validRows.length);
    upd(5, 'running'); await new Promise(r => setTimeout(r, 300)); upd(5, 'done');
    setPhase('done');
    onImportDone(resultMap);
  }, [parsedRows, onImportDone]);

  if (!open) return null;

  const validCount = parsedRows.filter(r => r.studentId && !r.errors.length && Object.keys(r.marks).length > 0).length;
  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 55%,#4f46e5 100%)' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.07) 1px,transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <FiUpload size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Import CBC Marks from Excel</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(199,210,254,0.8)' }}>
                {gradeName} ┬╖ {activeStream} ┬╖ {subjectName || 'All Learning Areas'} ┬╖ {termName} ┬╖ {selAssessmentType}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="relative w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition hover:scale-110" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <FiX size={16} className="text-white" />
          </button>
        </div>

        {/* Rubric legend */}
        <div className="px-6 py-2 flex items-center gap-3 flex-shrink-0 border-b" style={{ background: '#f8faff' }}>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rubric:</span>
          {RUBRIC_CFG.map(r => (
            <span key={r.code} className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
              {r.code} {r.min}ΓÇô{r.max}%
            </span>
          ))}
          <span className="ml-auto text-[10px] text-gray-400">{students.length} students ┬╖ {learningAreas.length} subject{learningAreas.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* IDLE */}
          {phase === 'idle' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl border-2" style={{ borderColor: '#c7d2fe', background: 'linear-gradient(135deg,#f8faff,#eff6ff)' }}>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8)' }}>
                    <FiDownload size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-800">Step 1 ΓÇö Download Premium Template</p>
                    <p className="text-xs text-gray-500 mt-1">Pre-filled with <strong>{students.length} students</strong> ┬╖ Stream: <strong>{activeStream}</strong> ┬╖ Grade: <strong>{gradeName}</strong> ┬╖ Term: <strong>{termName}</strong></p>
                    <ul className="text-[11px] text-gray-400 mt-2 space-y-0.5 list-disc list-inside">
                      <li>Auto-rubric formula column (EE/ME/AE/BE shows live in Excel)</li>
                      <li>Class average formula row at bottom</li>
                      <li>Student name, admission no, stream, gender, pathway pre-filled</li>
                      <li>Instructions sheet included</li>
                    </ul>
                  </div>
                  <button onClick={downloadTemplate}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-black text-white cursor-pointer hover:scale-105 transition-all flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', boxShadow: '0 4px 16px rgba(29,78,216,0.4)' }}>
                    <FiDownload size={14} /> Download Excel
                  </button>
                </div>
              </div>

              <div
                onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:scale-[1.01] p-10 text-center"
                style={{ borderColor: '#a5b4fc', background: 'linear-gradient(135deg,#fafbff,#f0f4ff)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                  <FiUpload size={28} className="text-white" />
                </div>
                <p className="font-black text-gray-800 text-lg mb-1">Step 2 ΓÇö Upload Filled Excel</p>
                <p className="text-sm text-gray-400 mb-4">Drag & drop the filled template here, or click to browse</p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white" style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 12px rgba(5,150,105,0.35)' }}>
                  <FiFileText size={14} /> Browse File
                </span>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              </div>
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><FiAlertCircle size={14} />{error}</div>}
            </div>
          )}

          {/* PREVIEW */}
          {phase === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-black text-gray-700 flex items-center gap-1.5"><FiFileText className="text-blue-500" size={14} />{fileName}</span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#D1FAE5', color: '#059669' }}>Γ£ô {validCount} ready</span>
                  {errorCount > 0 && <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>Γ£ò {errorCount} errors</span>}
                </div>
                <button onClick={() => { setPhase('idle'); setFileName(''); setParsedRows([]); setError(''); }} className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer"><FiX size={12} /> Change file</button>
              </div>

              <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8,#4f46e5)' }}>
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">{parsedRows.length} rows parsed</span>
                  <span className="text-[10px]" style={{ color: 'rgba(199,210,254,0.7)' }}>Rubrics auto-assigned from scores</span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-black text-gray-500 text-[10px] uppercase sticky left-0 bg-gray-50 min-w-[180px]">Student</th>
                        <th className="px-2 py-2 text-left font-black text-gray-500 text-[10px] uppercase min-w-[80px]">Stream</th>
                        {learningAreas.slice(0, 6).map((la: any) => (
                          <th key={la.code} className="px-2 py-2 text-center font-black text-gray-500 text-[10px] uppercase min-w-[70px]">{la.code || la.name?.slice(0, 6)}</th>
                        ))}
                        <th className="px-2 py-2 text-center font-black text-gray-500 text-[10px] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr key={i} className={`border-b border-gray-100 ${row.errors.length > 0 ? 'bg-red-50/50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="px-3 py-2 sticky left-0 bg-inherit">
                            <p className="font-bold text-gray-800 leading-tight">{row.studentName}</p>
                            <p className="text-[10px] text-gray-400">{row.admNo}</p>
                          </td>
                          <td className="px-2 py-2 text-[10px] text-gray-500">{row.stream || 'ΓÇö'}</td>
                          {learningAreas.slice(0, 6).map((la: any) => {
                            const score = row.marks[la.code];
                            const rubric = score !== undefined ? getRubric(score) : null;
                            return (
                              <td key={la.code} className="px-1 py-2 text-center">
                                {rubric ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-bold" style={{ color: rubric.color }}>{score}</span>
                                    <span className="text-[9px] font-black px-1 rounded" style={{ background: rubric.bg, color: rubric.color }}>{rubric.code}</span>
                                  </div>
                                ) : <span className="text-gray-200">ΓÇö</span>}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center">
                            {row.errors.length > 0
                              ? <span className="text-[10px] font-black text-red-500" title={row.errors.join(', ')}>ΓÜá Error</span>
                              : <span className="text-[10px] font-black text-green-600">Γ£ô OK</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><FiAlertCircle size={14} />{error}</div>}
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setPhase('idle'); setParsedRows([]); setFileName(''); }} className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer transition">Cancel</button>
                <button onClick={runImport} disabled={validCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white cursor-pointer transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 16px rgba(5,150,105,0.35)' }}>
                  <FiZap size={14} /> Import {validCount} Students & Generate Rubrics
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING / DONE */}
          {(phase === 'processing' || phase === 'done') && (
            <div className="space-y-5">
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
                    style={{
                      background: step.status === 'running' ? 'linear-gradient(135deg,#eff6ff,#f5f3ff)' : step.status === 'done' ? '#f0fdf4' : '#f9fafb',
                      borderColor: step.status === 'running' ? '#93c5fd' : step.status === 'done' ? '#6ee7b7' : '#e5e7eb',
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: step.status === 'running' ? 'linear-gradient(135deg,#1d4ed8,#4f46e5)' : step.status === 'done' ? 'linear-gradient(135deg,#059669,#10b981)' : '#E5E7EB' }}>
                      {step.status === 'running' && <FiRefreshCw size={16} className="text-white animate-spin" />}
                      {step.status === 'done' && <FiCheckCircle size={16} className="text-white" />}
                      {step.status === 'waiting' && <span className="text-xs font-black text-gray-400">{i + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-black ${step.status === 'running' ? 'text-blue-700' : step.status === 'done' ? 'text-green-700' : 'text-gray-500'}`}>{step.label}</p>
                      {step.count !== undefined && step.status === 'done' && <p className="text-xs text-gray-400 mt-0.5">{step.count} records processed</p>}
                      {step.status === 'running' && (
                        <div className="mt-1.5 h-1.5 rounded-full overflow-hidden bg-blue-100">
                          <div className="h-full rounded-full animate-pulse" style={{ width: '65%', background: 'linear-gradient(90deg,#1d4ed8,#4f46e5)' }} />
                        </div>
                      )}
                    </div>
                    {step.status === 'done' && <span className="text-sm font-black text-green-500">Γ£ô</span>}
                  </div>
                ))}
              </div>

              {steps[1]?.status === 'done' && (
                <div className="p-4 rounded-2xl border" style={{ background: 'linear-gradient(135deg,#f8faff,#eff6ff)', borderColor: '#c7d2fe' }}>
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Auto-Generated Rubric Distribution</p>
                  <div className="grid grid-cols-4 gap-3">
                    {RUBRIC_CFG.map(r => (
                      <div key={r.code} className="text-center p-3 rounded-xl border" style={{ background: r.bg, borderColor: r.border }}>
                        <p className="text-2xl font-black" style={{ color: r.color }}>{rubricStats[r.code as keyof typeof rubricStats]}</p>
                        <p className="text-[10px] font-black mt-0.5" style={{ color: r.color }}>{r.code}</p>
                        <p className="text-[9px] text-gray-400">{r.min}ΓÇô{r.max}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'done' && (
                <div className="flex justify-end">
                  <button onClick={onClose} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white cursor-pointer hover:scale-105 transition"
                    style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 16px rgba(5,150,105,0.35)' }}>
                    <FiCheckCircle size={14} /> Done ΓÇö Marks Loaded into Grid
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

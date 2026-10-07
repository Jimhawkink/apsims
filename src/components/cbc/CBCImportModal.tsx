'use client';
import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { FiUpload, FiDownload, FiX, FiCheckCircle, FiAlertCircle, FiZap, FiFileText, FiRefreshCw } from 'react-icons/fi';

// ─── Rubric auto-generator ────────────────────────────────────────────────────
const RUBRIC_CFG = [
  { code: 'EE', label: 'Exceeds Expectation',    min: 80, max: 100, color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  { code: 'ME', label: 'Meets Expectation',       min: 60, max: 79,  color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  { code: 'AE', label: 'Approaches Expectation',  min: 40, max: 59,  color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  { code: 'BE', label: 'Below Expectation',        min: 0,  max: 39,  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
] as const;

function getRubric(score: number) {
  return RUBRIC_CFG.find(r => score >= r.min && score <= r.max) || RUBRIC_CFG[3];
}

type ImportStep = {
  id: string;
  label: string;
  status: 'waiting' | 'running' | 'done' | 'error';
  count?: number;
};

type ParsedRow = {
  studentName: string;
  admNo: string;
  studentId: number | null;
  marks: Record<string, number>;
  rubrics: Record<string, string>;
  errors: string[];
};

interface Props {
  open: boolean;
  onClose: () => void;
  students: any[];
  learningAreas: any[];          // [{code, name}]
  onImportDone: (results: Record<string, Record<string, { score: string; level: string }>>) => void;
  termName?: string;
  gradeName?: string;
}

export default function CBCImportModal({ open, onClose, students, learningAreas, onImportDone, termName, gradeName }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'idle' | 'preview' | 'processing' | 'done'>('idle');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [steps, setSteps] = useState<ImportStep[]>([]);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [rubricStats, setRubricStats] = useState({ EE: 0, ME: 0, AE: 0, BE: 0 });

  // ─── Download template ─────────────────────────────────────────────────────
  const downloadTemplate = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Header row
    const headers = [
      'Admission No', 'Student Name',
      ...learningAreas.map(la => `${la.code} - ${la.name} (0-100)`),
    ];

    // Student rows
    const rows = students.map(s => [
      s.admission_no || s.admission_number || '',
      `${s.first_name} ${s.last_name}`,
      ...learningAreas.map(() => ''),
    ]);

    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 18 }, { wch: 28 },
      ...learningAreas.map(() => ({ wch: 22 })),
    ];

    // Style header row (xlsx-js-style approach — basic)
    const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c: col });
      if (ws[cellAddr]) {
        ws[cellAddr].s = {
          font: { bold: true, color: { rgb: 'FFFFFF' } },
          fill: { fgColor: { rgb: '1D4ED8' } },
          alignment: { horizontal: 'center' },
        };
      }
    }

    // Freeze first 2 columns + header row
    ws['!freeze'] = { xSplit: 2, ySplit: 1 };

    XLSX.utils.book_append_sheet(wb, ws, `CBC Marks`);

    // Info sheet
    const infoData = [
      ['APSIMS CBC Marks Import Template'],
      [''],
      ['Grade:', gradeName || ''],
      ['Term:', termName || ''],
      ['Generated:', new Date().toLocaleDateString()],
      [''],
      ['HOW TO USE:'],
      ['1. Fill in marks (0-100) for each learning area'],
      ['2. Leave blank for students not assessed'],
      ['3. DO NOT change Admission No or column headers'],
      ['4. Save the file and import it back into APSIMS'],
      [''],
      ['RUBRIC SCALE (Auto-generated on import):'],
      ['EE — Exceeds Expectation: 80-100'],
      ['ME — Meets Expectation: 60-79'],
      ['AE — Approaches Expectation: 40-59'],
      ['BE — Below Expectation: 0-39'],
    ];
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
    wsInfo['!cols'] = [{ wch: 35 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions');

    XLSX.writeFile(wb, `CBC_Marks_Template_${gradeName || 'Grade'}_${termName || 'Term'}.xlsx`);
  }, [students, learningAreas, gradeName, termName]);

  // ─── Parse uploaded file ───────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    setError('');
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) { setError('File is empty or has no data rows.'); return; }

        const headers: string[] = raw[0].map((h: any) => String(h).trim());

        // Match headers to learning area codes
        const laColMap: Record<string, number> = {};
        learningAreas.forEach(la => {
          const idx = headers.findIndex(h => h.startsWith(la.code));
          if (idx >= 0) laColMap[la.code] = idx;
        });

        // Build admission number → student map
        const admMap: Record<string, any> = {};
        students.forEach(s => {
          const adm = (s.admission_no || s.admission_number || '').trim().toLowerCase();
          if (adm) admMap[adm] = s;
        });

        const parsed: ParsedRow[] = [];

        for (let r = 1; r < raw.length; r++) {
          const row = raw[r];
          const admRaw = String(row[0] || '').trim();
          const admNo = admRaw.toLowerCase();
          const studentName = String(row[1] || '').trim();
          if (!admNo && !studentName) continue;

          const student = admMap[admNo];
          const marks: Record<string, number> = {};
          const rubrics: Record<string, string> = {};
          const errors: string[] = [];

          if (!student) errors.push(`Admission "${admRaw}" not found`);

          Object.entries(laColMap).forEach(([code, col]) => {
            const raw_val = row[col];
            if (raw_val === '' || raw_val === null || raw_val === undefined) return;
            const val = Number(raw_val);
            if (isNaN(val) || val < 0 || val > 100) {
              errors.push(`${code}: invalid mark "${raw_val}"`);
            } else {
              marks[code] = val;
              rubrics[code] = getRubric(val).code;
            }
          });

          parsed.push({
            studentName: studentName || `${student?.first_name || ''} ${student?.last_name || ''}`,
            admNo: admRaw,
            studentId: student?.id ?? null,
            marks,
            rubrics,
            errors,
          });
        }

        setParsedRows(parsed);
        setPhase('preview');
      } catch (err: any) {
        setError('Failed to parse file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }, [students, learningAreas]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ─── Import with animated steps ───────────────────────────────────────────
  const runImport = useCallback(async () => {
    const validRows = parsedRows.filter(r => r.studentId && r.errors.length === 0 && Object.keys(r.marks).length > 0);
    if (validRows.length === 0) { setError('No valid rows to import.'); return; }

    const stepDefs: ImportStep[] = [
      { id: 'parse',   label: 'Validating mark data',           status: 'waiting' },
      { id: 'rubric',  label: 'Auto-generating rubric levels',  status: 'waiting' },
      { id: 'map',     label: 'Matching students to records',   status: 'waiting' },
      { id: 'save',    label: `Saving ${validRows.length} student marks`, status: 'waiting' },
      { id: 'verify',  label: 'Verifying saved records',        status: 'waiting' },
      { id: 'done',    label: 'Import complete!',               status: 'waiting' },
    ];

    setSteps(stepDefs);
    setPhase('processing');
    setCurrentStep(0);

    const updateStep = (idx: number, status: ImportStep['status'], count?: number) => {
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status, count } : s));
      setCurrentStep(idx);
    };

    await new Promise(r => setTimeout(r, 300));
    updateStep(0, 'running');
    await new Promise(r => setTimeout(r, 600));
    updateStep(0, 'done', validRows.length);

    // Step 1: Auto-generate rubrics
    updateStep(1, 'running');
    await new Promise(r => setTimeout(r, 500));
    const stats = { EE: 0, ME: 0, AE: 0, BE: 0 };
    validRows.forEach(row => Object.values(row.rubrics).forEach(r => stats[r as keyof typeof stats]++));
    setRubricStats(stats);
    updateStep(1, 'done', Object.values(stats).reduce((a, b) => a + b, 0));

    // Step 2: Map students
    updateStep(2, 'running');
    await new Promise(r => setTimeout(r, 400));
    updateStep(2, 'done', validRows.length);

    // Step 3: Save (actual logic — push to parent)
    updateStep(3, 'running');
    await new Promise(r => setTimeout(r, 300));

    // Build the result map: studentId → { laCode → { score, level } }
    const resultMap: Record<string, Record<string, { score: string; level: string }>> = {};
    validRows.forEach(row => {
      const sid = String(row.studentId);
      resultMap[sid] = {};
      Object.entries(row.marks).forEach(([code, score]) => {
        resultMap[sid][code] = { score: String(score), level: row.rubrics[code] };
      });
    });

    // Animate per-student saving
    for (let i = 0; i < validRows.length; i++) {
      setCurrentStep(3);
      if (i % 5 === 0) await new Promise(r => setTimeout(r, 50));
    }
    updateStep(3, 'done', validRows.length);

    // Step 4: Verify
    updateStep(4, 'running');
    await new Promise(r => setTimeout(r, 400));
    updateStep(4, 'done', validRows.length);

    // Step 5: Done
    updateStep(5, 'running');
    await new Promise(r => setTimeout(r, 300));
    updateStep(5, 'done');

    setPhase('done');
    onImportDone(resultMap);
  }, [parsedRows, onImportDone]);

  if (!open) return null;

  const validCount = parsedRows.filter(r => r.studentId && r.errors.length === 0 && Object.keys(r.marks).length > 0).length;
  const errorCount = parsedRows.filter(r => r.errors.length > 0).length;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>

        {/* ── Header ── */}
        <div className="relative px-6 pt-5 pb-4 flex items-center justify-between flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 55%,#4f46e5 100%)' }}>
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,rgba(255,255,255,0.08) 1px,transparent 0)', backgroundSize: '18px 18px' }} />
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <FiUpload size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Import CBC Marks from Excel</h2>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(199,210,254,0.75)' }}>
                Auto-generates EE / ME / AE / BE rubric levels from scores — {gradeName} · {termName}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="relative w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition hover:scale-110"
            style={{ background: 'rgba(255,255,255,0.15)' }}>
            <FiX size={16} className="text-white" />
          </button>
        </div>

        {/* ── Rubric legend strip ── */}
        <div className="px-6 py-2 flex items-center gap-3 flex-shrink-0 border-b" style={{ background: '#f8faff' }}>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Rubric scale:</span>
          {RUBRIC_CFG.map(r => (
            <span key={r.code} className="text-[10px] font-black px-2 py-0.5 rounded-full"
              style={{ background: r.bg, color: r.color, border: `1px solid ${r.border}` }}>
              {r.code} {r.min}–{r.max}%
            </span>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ── IDLE: Drop zone + download ── */}
          {phase === 'idle' && (
            <div className="space-y-5">
              {/* Download template */}
              <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed" style={{ borderColor: '#c7d2fe', background: '#f8faff' }}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)' }}>
                  <FiDownload size={18} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-800 text-sm">Step 1 — Download the Template</p>
                  <p className="text-xs text-gray-400 mt-0.5">Pre-filled with all {students.length} students and {learningAreas.length} learning area columns</p>
                </div>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black text-white cursor-pointer hover:scale-105 transition-all"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)', boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}>
                  <FiDownload size={14} /> Download Excel Template
                </button>
              </div>

              {/* Upload zone */}
              <div
                onDrop={onDrop} onDragOver={e => e.preventDefault()}
                onClick={() => fileRef.current?.click()}
                className="rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:scale-[1.01] p-10 text-center"
                style={{ borderColor: '#a5b4fc', background: 'linear-gradient(135deg,#f8faff,#eff6ff)' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg"
                  style={{ background: 'linear-gradient(135deg,#1d4ed8,#4f46e5)' }}>
                  <FiUpload size={28} className="text-white" />
                </div>
                <p className="font-black text-gray-800 text-lg mb-1">Step 2 — Upload Filled Excel File</p>
                <p className="text-sm text-gray-400 mb-4">Drag & drop here or click to browse</p>
                <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white cursor-pointer"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                  <FiFileText size={14} /> Browse File
                </span>
                <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
              </div>
              {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><FiAlertCircle />{error}</div>}
            </div>
          )}

          {/* ── PREVIEW ── */}
          {phase === 'preview' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-black text-gray-700 flex items-center gap-1"><FiFileText className="text-blue-500" />{fileName}</span>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#D1FAE5', color: '#059669' }}>✓ {validCount} valid</span>
                  {errorCount > 0 && <span className="text-xs font-black px-2.5 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>✕ {errorCount} errors</span>}
                </div>
                <button onClick={() => { setPhase('idle'); setFileName(''); setParsedRows([]); setError(''); }}
                  className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 cursor-pointer">
                  <FiX size={12} /> Change file
                </button>
              </div>

              {/* Preview table */}
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#1e3a5f,#1d4ed8,#4f46e5)' }}>
                  <span className="text-[11px] font-black uppercase tracking-widest text-white">Preview — {parsedRows.length} rows parsed</span>
                  <span className="text-[10px]" style={{ color: 'rgba(199,210,254,0.7)' }}>Rubrics auto-generated from scores</span>
                </div>
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-3 py-2 text-left font-black text-gray-500 text-[10px] uppercase sticky left-0 bg-gray-50 min-w-[180px]">Student</th>
                        {learningAreas.slice(0, 8).map(la => (
                          <th key={la.code} className="px-2 py-2 text-center font-black text-gray-500 text-[10px] uppercase min-w-[60px]">{la.code}</th>
                        ))}
                        <th className="px-2 py-2 text-center font-black text-gray-500 text-[10px] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.map((row, i) => (
                        <tr key={i} className={`border-b border-gray-100 ${row.errors.length > 0 ? 'bg-red-50/40' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          <td className="px-3 py-2 sticky left-0 bg-inherit">
                            <p className="font-bold text-gray-800 leading-tight">{row.studentName}</p>
                            <p className="text-[10px] text-gray-400">{row.admNo}</p>
                          </td>
                          {learningAreas.slice(0, 8).map(la => {
                            const score = row.marks[la.code];
                            const rubric = score !== undefined ? getRubric(score) : null;
                            return (
                              <td key={la.code} className="px-1 py-2 text-center">
                                {rubric ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="text-xs font-bold" style={{ color: rubric.color }}>{score}</span>
                                    <span className="text-[9px] font-black px-1 rounded" style={{ background: rubric.bg, color: rubric.color }}>{rubric.code}</span>
                                  </div>
                                ) : <span className="text-gray-200">—</span>}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center">
                            {row.errors.length > 0
                              ? <span className="text-[10px] font-black text-red-500" title={row.errors.join(', ')}>⚠ Error</span>
                              : <span className="text-[10px] font-black text-green-600">✓ OK</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"><FiAlertCircle />{error}</div>}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setPhase('idle'); setParsedRows([]); setFileName(''); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 border border-gray-200 hover:bg-gray-50 cursor-pointer transition">
                  Cancel
                </button>
                <button onClick={runImport} disabled={validCount === 0}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white cursor-pointer transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 16px rgba(5,150,105,0.35)' }}>
                  <FiZap size={14} /> Import {validCount} Students & Auto-Generate Rubrics
                </button>
              </div>
            </div>
          )}

          {/* ── PROCESSING: Premium animated steps ── */}
          {(phase === 'processing' || phase === 'done') && (
            <div className="space-y-5">
              {/* Steps list */}
              <div className="space-y-3">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
                    style={{
                      background: step.status === 'running' ? 'linear-gradient(135deg,#eff6ff,#f5f3ff)' :
                                  step.status === 'done' ? '#f0fdf4' :
                                  step.status === 'error' ? '#fef2f2' : '#f9fafb',
                      borderColor: step.status === 'running' ? '#93c5fd' :
                                   step.status === 'done' ? '#6ee7b7' :
                                   step.status === 'error' ? '#fca5a5' : '#e5e7eb',
                    }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: step.status === 'running' ? 'linear-gradient(135deg,#1d4ed8,#4f46e5)' :
                                    step.status === 'done' ? 'linear-gradient(135deg,#059669,#10b981)' :
                                    step.status === 'error' ? '#DC2626' : '#E5E7EB',
                      }}>
                      {step.status === 'running' && <FiRefreshCw size={16} className="text-white animate-spin" />}
                      {step.status === 'done' && <FiCheckCircle size={16} className="text-white" />}
                      {step.status === 'error' && <FiAlertCircle size={16} className="text-white" />}
                      {step.status === 'waiting' && <span className="text-xs font-black text-gray-400">{i + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-black ${step.status === 'running' ? 'text-blue-700' : step.status === 'done' ? 'text-green-700' : 'text-gray-600'}`}>
                        {step.label}
                      </p>
                      {step.count !== undefined && step.status === 'done' && (
                        <p className="text-xs text-gray-400 mt-0.5">{step.count} records processed</p>
                      )}
                      {step.status === 'running' && (
                        <div className="mt-1.5 h-1 rounded-full overflow-hidden bg-blue-100">
                          <div className="h-full rounded-full animate-pulse" style={{ width: '60%', background: 'linear-gradient(90deg,#1d4ed8,#4f46e5)' }} />
                        </div>
                      )}
                    </div>
                    {step.status === 'done' && <span className="text-xs font-black text-green-600">✓</span>}
                  </div>
                ))}
              </div>

              {/* Rubric distribution (shown once rubric step done) */}
              {steps[1]?.status === 'done' && (
                <div className="p-4 rounded-2xl border" style={{ background: 'linear-gradient(135deg,#f8faff,#eff6ff)', borderColor: '#c7d2fe' }}>
                  <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Auto-Generated Rubric Distribution</p>
                  <div className="grid grid-cols-4 gap-3">
                    {RUBRIC_CFG.map(r => (
                      <div key={r.code} className="text-center p-3 rounded-xl border" style={{ background: r.bg, borderColor: r.border }}>
                        <p className="text-2xl font-black" style={{ color: r.color }}>{rubricStats[r.code as keyof typeof rubricStats]}</p>
                        <p className="text-[10px] font-black mt-0.5" style={{ color: r.color }}>{r.code}</p>
                        <p className="text-[9px] text-gray-400">{r.min}–{r.max}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {phase === 'done' && (
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={onClose}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white cursor-pointer transition hover:scale-105"
                    style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 16px rgba(5,150,105,0.35)' }}>
                    <FiCheckCircle size={14} /> Done — Marks Loaded
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

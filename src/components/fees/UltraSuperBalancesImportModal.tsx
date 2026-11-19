/**
 * UltraSuperBalancesImportModal.tsx
 * Enterprise Super Balances & Arrears Importer with Dual-Track CBC & 8-4-4 Considerations
 * Supports .xlsx & .csv parsing, live student matching validation, pre-import preview datagrid,
 * and one-click template downloads for both 8-4-4 Secondary and CBC Senior/JSS cohorts.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import ExcelJS from 'exceljs';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { fmt } from '@/hooks/useUltraFeeCollect';
import {
  FiUpload, FiFileText, FiCheckCircle, FiAlertTriangle, FiX,
  FiDownload, FiArrowRight, FiCheck, FiUsers, FiLayers, FiHelpCircle,
} from 'react-icons/fi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  forms: any[];
  streams: any[];
  terms: any[];
  currentTerm: any;
  onSuccess: () => void;
  schoolName?: string;
}

interface ParsedRow {
  index: number;
  rawAdm: string;
  rawName: string;
  rawForm: string;
  rawStream: string;
  rawTrack: string;
  amountPaid: number;
  arrearsOwed: number;
  notes: string;
  status: 'MATCHED' | 'NAME_MATCHED' | 'UNMATCHED';
  matchedStudent?: any;
}

export default function UltraSuperBalancesImportModal({
  isOpen,
  onClose,
  students,
  forms,
  streams,
  terms,
  currentTerm,
  onSuccess,
  schoolName = 'Alpha Premier School',
}: Props) {
  const [step, setStep] = useState<'upload' | 'preview' | 'committing'>('upload');
  const [selectedTermId, setSelectedTermId] = useState<number>(currentTerm?.id || (terms[0]?.id ?? 0));
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [skipUnmatched, setSkipUnmatched] = useState(true);
  const [curriculumFocus, setCurriculumFocus] = useState<'ALL' | '844' | 'CBC'>('ALL');

  if (!isOpen) return null;

  // Student Lookup Dictionaries
  const studentByAdm = useMemo(() => {
    const map = new Map<string, any>();
    students.forEach((s) => {
      const a1 = (s.admission_no || '').toString().trim().toLowerCase();
      const a2 = (s.admission_number || '').toString().trim().toLowerCase();
      if (a1) map.set(a1, s);
      if (a2) map.set(a2, s);

      // Also clean slash variations: e.g. "2022/015" vs "015"
      const cleanA1 = a1.replace(/[^a-z0-9]/gi, '');
      if (cleanA1) map.set(cleanA1, s);
    });
    return map;
  }, [students]);

  const studentByName = useMemo(() => {
    const map = new Map<string, any>();
    students.forEach((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.trim().toLowerCase();
      map.set(fullName, s);
    });
    return map;
  }, [students]);

  // Form Lookup Helper
  const formMap = useMemo(() => {
    const map = new Map<number, any>();
    forms.forEach((f) => map.set(f.id, f));
    return map;
  }, [forms]);

  // ── 1. GENERATE DUAL-TRACK SAMPLE TEMPLATES ──
  const handleDownloadTemplate = async (track: '844' | 'CBC' | 'UNIVERSAL') => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'APSIMS Finance';

    const sheetName =
      track === '844'
        ? '8-4-4 Balances Template'
        : track === 'CBC'
        ? 'CBC Balances Template'
        : 'Universal Balances Template';

    const sheet = workbook.addWorksheet(sheetName);

    // Title
    sheet.mergeCells('A1:I1');
    const tCell = sheet.getCell('A1');
    tCell.value = `${schoolName.toUpperCase()} — ${track} OPENING BALANCES & ARREARS IMPORT TEMPLATE`;
    tCell.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF1E3A8A' } };
    sheet.getRow(1).height = 24;

    sheet.mergeCells('A2:I2');
    const noteCell = sheet.getCell('A2');
    noteCell.value = 'Fill in the opening balance amount paid prior to system setup, or carried-forward arrears owed. Leave Admission No unchanged for auto-matching.';
    noteCell.font = { name: 'Segoe UI', size: 9, italic: true, color: { argb: 'FF64748B' } };
    sheet.getRow(2).height = 18;

    const headers = [
      'Admission No *',
      'Student Name',
      'Curriculum Track',
      'Form / Grade',
      'Stream',
      'Opening Balance Paid (KES)',
      'Historical Arrears Owed (KES)',
      'Academic Year',
      'Notes / Ledger Source',
    ];

    const hRow = sheet.getRow(4);
    hRow.values = headers;
    hRow.height = 22;
    hRow.eachCell((c) => {
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' },
      };
      c.font = { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
      c.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    // Populate with actual active students filtered by track
    const filteredSampleStudents = students
      .filter((s) => {
        const formObj = formMap.get(s.form_id);
        const formName = String(formObj?.form_name || '').toLowerCase();
        if (track === '844') {
          return formName.startsWith('form') || formName.includes('844');
        }
        if (track === 'CBC') {
          return formName.includes('grade') || formName.includes('senior') || formName.includes('junior');
        }
        return true;
      })
      .slice(0, 50);

    filteredSampleStudents.forEach((st) => {
      const formObj = formMap.get(st.form_id);
      const isCBC = String(formObj?.form_name || '').toLowerCase().includes('grade');
      const row = sheet.addRow([
        st.admission_no || st.admission_number || '',
        `${st.first_name} ${st.last_name}`,
        isCBC ? 'CBC' : '8-4-4',
        formObj?.form_name || 'Form 1',
        'Main',
        0, // Opening balance paid
        0, // Arrears owed
        new Date().getFullYear(),
        'Carried forward from legacy ledger',
      ]);
      row.height = 19;
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(1).font = { name: 'Consolas', size: 9.5, bold: true };
      row.getCell(3).alignment = { horizontal: 'center' };
      row.getCell(6).numFmt = 'KES #,##0';
      row.getCell(7).numFmt = 'KES #,##0';
      row.getCell(8).alignment = { horizontal: 'center' };
    });

    sheet.columns.forEach((col) => {
      col.width = 20;
    });
    sheet.getColumn(1).width = 16;
    sheet.getColumn(2).width = 26;
    sheet.getColumn(9).width = 30;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `APSIMS_${track}_Balances_Import_Template.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${track} sample template!`);
  };

  // ── 2. PARSE EXCEL OR CSV UPLOAD ──
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const toastId = toast.loading('Reading file and validating against student database...');

    try {
      const rows: ParsedRow[] = [];

      if (file.name.endsWith('.csv')) {
        // CSV Parsing
        const text = await file.text();
        const lines = text.split('\n').filter(Boolean);
        if (lines.length < 2) throw new Error('File has no data rows');

        const headerLine = lines[0].toLowerCase();
        const headers = headerLine.split(',').map((h) => h.trim().replace(/["']/g, ''));

        const admIdx = headers.findIndex((h) => h.includes('adm') || h.includes('admission'));
        const nameIdx = headers.findIndex((h) => h.includes('name'));
        const formIdx = headers.findIndex((h) => h.includes('form') || h.includes('grade') || h.includes('class'));
        const trackIdx = headers.findIndex((h) => h.includes('track') || h.includes('system'));
        const paidIdx = headers.findIndex((h) => h.includes('paid') || h.includes('opening'));
        const arrearsIdx = headers.findIndex((h) => h.includes('arrears') || h.includes('owed') || h.includes('debt'));
        const notesIdx = headers.findIndex((h) => h.includes('note') || h.includes('memo') || h.includes('ref'));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          if (cols.length < 2) continue;

          const rawAdm = admIdx >= 0 ? cols[admIdx] : cols[0];
          const rawName = nameIdx >= 0 ? cols[nameIdx] : '';
          const rawForm = formIdx >= 0 ? cols[formIdx] : '';
          const rawTrack = trackIdx >= 0 ? cols[trackIdx] : '';
          const amountPaid = paidIdx >= 0 ? Number(cols[paidIdx]) || 0 : 0;
          const arrearsOwed = arrearsIdx >= 0 ? Number(cols[arrearsIdx]) || 0 : 0;
          const notes = notesIdx >= 0 ? cols[notesIdx] : '';

          if (!rawAdm && !rawName) continue;

          // Match Student
          const cleanAdm = rawAdm.trim().toLowerCase();
          const cleanAdmAlnum = cleanAdm.replace(/[^a-z0-9]/gi, '');
          let matched = studentByAdm.get(cleanAdm) || studentByAdm.get(cleanAdmAlnum);
          let matchStatus: ParsedRow['status'] = 'MATCHED';

          if (!matched && rawName) {
            matched = studentByName.get(rawName.trim().toLowerCase());
            if (matched) matchStatus = 'NAME_MATCHED';
          }

          if (!matched) matchStatus = 'UNMATCHED';

          rows.push({
            index: rows.length + 1,
            rawAdm,
            rawName,
            rawForm,
            rawStream: '',
            rawTrack,
            amountPaid,
            arrearsOwed,
            notes,
            status: matchStatus,
            matchedStudent: matched,
          });
        }
      } else {
        // Excel (.xlsx) Parsing via ExcelJS
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);

        const sheet = workbook.worksheets[0];
        if (!sheet) throw new Error('No worksheets found in Excel file');

        let headerRowNumber = 1;
        let admCol = 1;
        let nameCol = 2;
        let trackCol = 3;
        let formCol = 4;
        let streamCol = 5;
        let paidCol = 6;
        let arrearsCol = 7;
        let notesCol = 9;

        // Scan first 5 rows to locate header row
        for (let r = 1; r <= 5; r++) {
          const rowVals = sheet.getRow(r).values as any[];
          if (!rowVals) continue;
          const rowStr = rowVals.join(' ').toLowerCase();
          if (rowStr.includes('adm') || rowStr.includes('student')) {
            headerRowNumber = r;
            rowVals.forEach((val, colIdx) => {
              const str = String(val || '').toLowerCase();
              if (str.includes('adm')) admCol = colIdx;
              else if (str.includes('name')) nameCol = colIdx;
              else if (str.includes('track')) trackCol = colIdx;
              else if (str.includes('form') || str.includes('grade')) formCol = colIdx;
              else if (str.includes('stream')) streamCol = colIdx;
              else if (str.includes('paid') || str.includes('opening')) paidCol = colIdx;
              else if (str.includes('arrears') || str.includes('owed')) arrearsCol = colIdx;
              else if (str.includes('note')) notesCol = colIdx;
            });
            break;
          }
        }

        // Iterate data rows
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber <= headerRowNumber) return;

          const rawAdm = String(row.getCell(admCol).value || '').trim();
          const rawName = String(row.getCell(nameCol).value || '').trim();
          const rawTrack = String(row.getCell(trackCol).value || '').trim();
          const rawForm = String(row.getCell(formCol).value || '').trim();
          const rawStream = String(row.getCell(streamCol).value || '').trim();
          const amountPaid = Number(row.getCell(paidCol).value) || 0;
          const arrearsOwed = Number(row.getCell(arrearsCol).value) || 0;
          const notes = String(row.getCell(notesCol).value || '').trim();

          if (!rawAdm && !rawName) return;

          // Match Student
          const cleanAdm = rawAdm.toLowerCase();
          const cleanAdmAlnum = cleanAdm.replace(/[^a-z0-9]/gi, '');
          let matched = studentByAdm.get(cleanAdm) || studentByAdm.get(cleanAdmAlnum);
          let matchStatus: ParsedRow['status'] = 'MATCHED';

          if (!matched && rawName) {
            matched = studentByName.get(rawName.toLowerCase());
            if (matched) matchStatus = 'NAME_MATCHED';
          }

          if (!matched) matchStatus = 'UNMATCHED';

          rows.push({
            index: rows.length + 1,
            rawAdm,
            rawName,
            rawForm,
            rawStream,
            rawTrack,
            amountPaid,
            arrearsOwed,
            notes,
            status: matchStatus,
            matchedStudent: matched,
          });
        });
      }

      if (rows.length === 0) {
        throw new Error('No valid student balance rows could be parsed from the file');
      }

      setParsedRows(rows);
      setStep('preview');
      toast.dismiss(toastId);
      toast.success(`Successfully parsed ${rows.length} rows! Review matching preview.`);
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ── 3. STATS FOR PREVIEW STEP ──
  const previewStats = useMemo(() => {
    let matched = 0;
    let nameMatched = 0;
    let unmatched = 0;
    let totalPaid = 0;
    let totalArrears = 0;

    parsedRows.forEach((r) => {
      if (r.status === 'MATCHED') matched++;
      else if (r.status === 'NAME_MATCHED') nameMatched++;
      else unmatched++;

      totalPaid += r.amountPaid;
      totalArrears += r.arrearsOwed;
    });

    return {
      total: parsedRows.length,
      matched,
      nameMatched,
      unmatched,
      totalPaid,
      totalArrears,
      readyToCommit: skipUnmatched ? matched + nameMatched : parsedRows.length,
    };
  }, [parsedRows, skipUnmatched]);

  // ── 4. COMMIT TO SUPABASE ──
  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) =>
      skipUnmatched ? r.status === 'MATCHED' || r.status === 'NAME_MATCHED' : true
    );

    if (validRows.length === 0) {
      toast.error('No valid matched students to import balances for.');
      return;
    }

    setStep('committing');
    const toastId = toast.loading(`Inserting opening balances for ${validRows.length} students...`);

    let importedCount = 0;
    let failedCount = 0;

    try {
      const recordsToInsert = validRows.map((r, i) => {
        const studentId = r.matchedStudent?.id;
        const amount = r.amountPaid > 0 ? r.amountPaid : 0;
        const receiptNo = `OB-${selectedYear}-${Date.now().toString().slice(-4)}-${i + 1}`;

        return {
          student_id: studentId,
          amount,
          payment_date: new Date().toISOString().split('T')[0],
          payment_method: amount === 0 ? 'Opening Balance (Nil)' : 'Opening Balance',
          receipt_number: receiptNo,
          term_id: selectedTermId || null,
          year: selectedYear,
          notes:
            r.notes ||
            `Opening balance imported via Super Balances Hub. Track: ${r.rawTrack || 'Standard'}. Arrears noted: KES ${r.arrearsOwed}`,
        };
      });

      // Filter out any without studentId
      const cleanInserts = recordsToInsert.filter((rec) => rec.student_id);

      // Insert in chunks of 50 to avoid request size limits
      const CHUNK_SIZE = 50;
      for (let i = 0; i < cleanInserts.length; i += CHUNK_SIZE) {
        const chunk = cleanInserts.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('school_fee_payments').insert(chunk);
        if (error) {
          failedCount += chunk.length;
        } else {
          importedCount += chunk.length;
        }
      }

      toast.dismiss(toastId);
      if (importedCount > 0) {
        toast.success(`Import complete! ${importedCount} student balances credited.`, {
          icon: '🎉',
        });
        onSuccess();
        onClose();
      } else {
        toast.error('Failed to commit records to database.');
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      toast.error(`Database commit error: ${err.message}`);
    } finally {
      setStep('upload');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-3 md:p-5 font-sans">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-4xl w-full overflow-hidden my-auto animate-slideUpIn flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
              <FiUpload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Super Balances &amp; Arrears Importer
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Dual-Track CBC &amp; 8-4-4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Bulk upload historical opening balances, carried-forward debt &amp; prior receipts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center text-xs font-bold"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {step === 'upload' ? (
            <>
              {/* Target Term & Academic Year Strip */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Assign Balances to Term *
                  </label>
                  <select
                    value={selectedTermId}
                    onChange={(e) => setSelectedTermId(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.term_name} ({t.year}) {t.is_current ? '— Current' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">
                    Academic Year Reference *
                  </label>
                  <input
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Sample Templates Download Shelf */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                    <FiDownload className="w-4 h-4 text-indigo-600" /> Download Pre-Populated Templates
                  </span>
                  <span className="text-[10px] text-indigo-600 font-bold">
                    Pre-filled with your active students
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('844')}
                    className="p-3 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 text-left transition-all shadow-xs group"
                  >
                    <div className="text-xs font-black text-indigo-900 group-hover:text-indigo-600">
                      🎓 8-4-4 Secondary Template
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Forms 1 to 4 with standard vote-heads
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('CBC')}
                    className="p-3 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 text-left transition-all shadow-xs group"
                  >
                    <div className="text-xs font-black text-indigo-900 group-hover:text-indigo-600">
                      🇰🇪 CBC Senior &amp; JSS Template
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Grades 7–9 &amp; Grade 10 Senior School
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadTemplate('UNIVERSAL')}
                    className="p-3 rounded-xl bg-white border border-indigo-200 hover:border-indigo-400 text-left transition-all shadow-xs group"
                  >
                    <div className="text-xs font-black text-indigo-900 group-hover:text-indigo-600">
                      🌐 Universal Multi-Track Template
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      All cohorts combined in one sheet
                    </div>
                  </button>
                </div>
              </div>

              {/* Upload Drag & Drop Box */}
              <div className="p-8 rounded-3xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/20 transition-all text-center flex flex-col items-center justify-center cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 text-2xl mb-3 shadow-xs">
                  📊
                </div>
                <p className="text-sm font-extrabold text-slate-800">
                  Click or drag your filled balances spreadsheet here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports Excel (.xlsx, .xls) and standard comma-separated (.csv)
                </p>
                <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-xl bg-white text-indigo-700 text-xs font-bold border border-slate-200 shadow-xs">
                  Browse Files
                </span>
              </div>
            </>
          ) : (
            /* Step 2: Validation & Matching Preview Grid */
            <div className="space-y-4">
              {/* Validation Summary Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-center">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Total Rows
                  </div>
                  <div className="text-base font-black text-slate-900 mt-0.5 font-mono">
                    {previewStats.total}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">
                    Matched Students
                  </div>
                  <div className="text-base font-black text-emerald-800 mt-0.5 font-mono">
                    {previewStats.matched + previewStats.nameMatched}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center">
                  <div className="text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                    Unmatched Rows
                  </div>
                  <div className="text-base font-black text-rose-800 mt-0.5 font-mono">
                    {previewStats.unmatched}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-center">
                  <div className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider">
                    Opening Paid Sum
                  </div>
                  <div className="text-base font-black text-indigo-900 mt-0.5 font-mono">
                    {fmt(previewStats.totalPaid)}
                  </div>
                </div>
              </div>

              {/* Skip unmatched checkbox */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={skipUnmatched}
                    onChange={(e) => setSkipUnmatched(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Skip unmatched rows automatically during commit</span>
                </label>
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="text-indigo-600 hover:text-indigo-800 font-bold text-[11px]"
                >
                  Upload a different file
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-64 overflow-y-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-400 tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2 px-3">#</th>
                      <th className="py-2 px-3">Adm No</th>
                      <th className="py-2 px-3">Student Name</th>
                      <th className="py-2 px-3">Matched DB Student</th>
                      <th className="py-2 px-3 text-right">Opening Paid</th>
                      <th className="py-2 px-3 text-right">Arrears Owed</th>
                      <th className="py-2 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((r) => (
                      <tr key={r.index} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono text-slate-400">{r.index}</td>
                        <td className="py-2 px-3 font-mono font-bold text-indigo-700">{r.rawAdm}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">{r.rawName || '—'}</td>
                        <td className="py-2 px-3">
                          {r.matchedStudent ? (
                            <span className="text-emerald-700 font-bold">
                              ✓ {r.matchedStudent.first_name} {r.matchedStudent.last_name}
                            </span>
                          ) : (
                            <span className="text-rose-500 italic">Not found</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                          {fmt(r.amountPaid)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-rose-700">
                          {fmt(r.arrearsOwed)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {r.status === 'MATCHED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Matched
                            </span>
                          ) : r.status === 'NAME_MATCHED' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                              Name Match
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                              Unmatched
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>

          {step === 'preview' && (
            <button
              onClick={handleCommitImport}
              disabled={previewStats.readyToCommit === 0}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <FiCheck className="w-4 h-4" />
              <span>Commit {previewStats.readyToCommit} Opening Balances</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

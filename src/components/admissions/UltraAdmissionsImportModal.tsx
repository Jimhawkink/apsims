'use client';

import React, { useState, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  FiX,
  FiUploadCloud,
  FiFileText,
  FiCheckCircle,
  FiAlertTriangle,
  FiDownload,
  FiArrowRight,
  FiDatabase,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import { downloadAdmissionsTemplate } from './UltraAdmissionsExport';

interface UltraAdmissionsImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  student_first_name: string;
  student_middle_name?: string;
  student_last_name: string;
  gender?: string;
  date_of_birth?: string;
  form_applied_for: number;
  kcpe_index_number?: string;
  kcpe_total_marks?: number;
  kcpe_year?: number;
  previous_school?: string;
  guardian_full_name?: string;
  guardian_phone?: string;
  guardian_email?: string;
  guardian_national_id?: string;
  county?: string;
  blood_group?: string;
  status: string;
  isValid: boolean;
  errors: string[];
}

export function UltraAdmissionsImportModal({
  isOpen,
  onClose,
  onSuccess,
}: UltraAdmissionsImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const normalizeHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');

  const parseFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParsing(true);
    try {
      const XLSX = await import('xlsx');
      const arrayBuffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' });

      if (!rawData || rawData.length === 0) {
        toast.error('The selected file appears to be empty.');
        setParsing(false);
        return;
      }

      // Map raw rows to normalized fields
      const rows: ParsedRow[] = rawData.map((raw: any) => {
        const rowKeys = Object.keys(raw);
        const getVal = (patterns: string[]) => {
          for (const key of rowKeys) {
            const norm = normalizeHeader(key);
            for (const p of patterns) {
              if (norm.includes(p)) {
                return String(raw[key] || '').trim();
              }
            }
          }
          return '';
        };

        const firstName = getVal(['firstname', 'first', 'givenname']);
        const middleName = getVal(['middlename', 'middle']);
        const lastName = getVal(['lastname', 'last', 'surname']);
        const fullName = getVal(['studentname', 'name', 'fullname']);

        let fName = firstName;
        let lName = lastName;
        let mName = middleName;

        if (!fName && fullName) {
          const parts = fullName.split(/\s+/);
          fName = parts[0] || '';
          if (parts.length > 2) {
            mName = parts.slice(1, -1).join(' ');
            lName = parts[parts.length - 1] || '';
          } else if (parts.length === 2) {
            lName = parts[1] || '';
          }
        }

        const rawGender = getVal(['gender', 'sex']).toLowerCase();
        const gender = rawGender.startsWith('m') ? 'Male' : rawGender.startsWith('f') ? 'Female' : 'Male';

        const rawDob = getVal(['dob', 'dateofbirth', 'birthdate']);
        let dob = '';
        if (rawDob) {
          const d = new Date(rawDob);
          if (!isNaN(d.getTime())) {
            dob = d.toISOString().split('T')[0];
          }
        }

        const rawForm = getVal(['form', 'grade', 'class', 'formappliedfor']);
        let formNum = parseInt(rawForm.replace(/[^0-9]/g, ''), 10);
        if (isNaN(formNum) || formNum <= 0) formNum = 1;

        const kcpeMarksStr = getVal(['kcpemarks', 'marks', 'score', 'totalmarks']);
        const kcpeMarks = kcpeMarksStr ? parseInt(kcpeMarksStr, 10) : undefined;

        const kcpeIndex = getVal(['kcpeindex', 'indexnumber', 'indexno', 'kcpe']);
        const prevSchool = getVal(['previousschool', 'primaryschool', 'school']);
        const guardianName = getVal(['guardianfullname', 'guardianname', 'parentname', 'guardian']);
        const guardianPhone = getVal(['guardianphone', 'phone', 'mobile', 'cellphone', 'contact']);
        const guardianEmail = getVal(['guardianemail', 'email']);
        const nationalId = getVal(['guardiannationalid', 'nationalid', 'idnumber']);
        const county = getVal(['county', 'homecounty']);
        const bloodGroup = getVal(['bloodgroup', 'blood']);

        const errors: string[] = [];
        if (!fName) errors.push('Missing First Name');
        if (!lName) errors.push('Missing Last Name');
        if (!formNum) errors.push('Invalid Form/Grade');

        return {
          student_first_name: fName.toUpperCase(),
          student_middle_name: mName ? mName.toUpperCase() : undefined,
          student_last_name: lName.toUpperCase(),
          gender,
          date_of_birth: dob || undefined,
          form_applied_for: formNum,
          kcpe_index_number: kcpeIndex || undefined,
          kcpe_total_marks: !isNaN(kcpeMarks as number) ? kcpeMarks : undefined,
          kcpe_year: new Date().getFullYear() - 1,
          previous_school: prevSchool || undefined,
          guardian_full_name: guardianName || undefined,
          guardian_phone: guardianPhone || undefined,
          guardian_email: guardianEmail || undefined,
          guardian_national_id: nationalId || undefined,
          county: county || undefined,
          blood_group: bloodGroup || undefined,
          status: 'Submitted',
          isValid: errors.length === 0,
          errors,
        };
      });

      setParsedRows(rows);
      toast.success(`Parsed ${rows.length} records (${rows.filter((r) => r.isValid).length} valid).`);
    } catch (err: any) {
      toast.error(`Error parsing file: ${err.message || 'Invalid format'}`);
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseFile(e.dataTransfer.files[0]);
    }
  };

  const handleCommitImport = async () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast.error('No valid records to import.');
      return;
    }

    setSaving(true);
    try {
      const year = new Date().getFullYear();

      // Query current application count to generate sequence
      const { count } = await supabase
        .from('school_admission_applications')
        .select('id', { count: 'exact', head: true });

      let seq = (count || 0) + 1;

      const recordsToInsert = validRows.map((r) => {
        const refNo = `ADM-${year}-${String(seq++).padStart(6, '0')}`;
        return {
          reference_number: refNo,
          status: 'Submitted',
          student_first_name: r.student_first_name,
          student_middle_name: r.student_middle_name || null,
          student_last_name: r.student_last_name,
          gender: r.gender || null,
          date_of_birth: r.date_of_birth || null,
          form_applied_for: r.form_applied_for,
          kcpe_index_number: r.kcpe_index_number || null,
          kcpe_total_marks: r.kcpe_total_marks || null,
          kcpe_year: r.kcpe_year || year - 1,
          previous_school: r.previous_school || null,
          guardian_full_name: r.guardian_full_name || null,
          guardian_phone: r.guardian_phone || null,
          guardian_email: r.guardian_email || null,
          guardian_national_id: r.guardian_national_id || null,
          county: r.county || null,
          blood_group: r.blood_group || null,
          terms_agreed: true,
          created_at: new Date().toISOString(),
        };
      });

      const { error } = await supabase
        .from('school_admission_applications')
        .insert(recordsToInsert);

      if (error) throw error;

      toast.success(`🎉 Successfully imported ${recordsToInsert.length} applications!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const errorCount = parsedRows.filter((r) => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg">
              📥
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                Bulk Import Applications (Excel / CSV)
              </h2>
              <p className="text-xs text-slate-500">
                Upload student applicant rosters directly to the online intake registry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Template Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center gap-2.5">
              <FiFileText size={18} className="text-indigo-600 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-indigo-900">Need the standardized admissions spreadsheet?</p>
                <p className="text-[11px] text-indigo-700">Download the pre-formatted template with sample rows and column instructions.</p>
              </div>
            </div>
            <button
              onClick={downloadAdmissionsTemplate}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm transition"
            >
              <FiDownload size={13} />
              <span>Download Template (.xlsx)</span>
            </button>
          </div>

          {/* Upload Dropzone */}
          {parsedRows.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/20 rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    parseFile(e.target.files[0]);
                  }
                }}
              />
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl group-hover:scale-105 transition shadow-sm">
                <FiUploadCloud size={26} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {parsing ? 'Parsing spreadsheet...' : 'Click to select or drag & drop spreadsheet'}
                </p>
                <p className="text-xs text-slate-400 mt-1">Supports Excel (.xlsx, .xls) and CSV format</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Stats Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">
                    File: <span className="font-mono text-slate-900">{file?.name}</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    ✓ {validCount} Valid
                  </span>
                  {errorCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold">
                      ⚠ {errorCount} Invalid
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setParsedRows([]);
                    setFile(null);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
                >
                  Upload different file
                </button>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-2">#</th>
                      <th className="px-3 py-2">Validation</th>
                      <th className="px-3 py-2">Student Name</th>
                      <th className="px-3 py-2">Gender</th>
                      <th className="px-3 py-2">Class</th>
                      <th className="px-3 py-2">KCPE Marks</th>
                      <th className="px-3 py-2">Guardian Phone</th>
                      <th className="px-3 py-2">County</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.slice(0, 50).map((r, i) => (
                      <tr key={i} className={r.isValid ? 'hover:bg-slate-50' : 'bg-rose-50/30'}>
                        <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                              <FiCheckCircle size={12} /> Valid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-bold text-[11px]" title={r.errors.join(', ')}>
                              <FiAlertTriangle size={12} /> {r.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-800">
                          {[r.student_first_name, r.student_middle_name, r.student_last_name].filter(Boolean).join(' ')}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{r.gender}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">Form/Grade {r.form_applied_for}</td>
                        <td className="px-3 py-2 font-mono font-bold text-slate-800">{r.kcpe_total_marks ?? '—'}</td>
                        <td className="px-3 py-2 text-slate-600 font-mono">{r.guardian_phone || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{r.county || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 50 && (
                <p className="text-[11px] text-slate-400 text-center">
                  Showing first 50 rows of {parsedRows.length} total records.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleCommitImport}
            disabled={saving || validCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 disabled:opacity-50 transition active:scale-95"
          >
            <FiDatabase size={14} />
            <span>{saving ? 'Importing...' : `Import ${validCount} Valid Records to Database`}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

'use client';

import {
  FiSearch,
  FiCheckCircle,
  FiCheck,
  FiX,
} from 'react-icons/fi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterBarProps {
  forms: any[];
  streams: any[];
  subjects: any[];
  terms: any[];
  selForm: string;
  selStream: string;
  selSubject: string;
  selTerm: string;
  selAssessmentType: string;
  searchQuery: string;
  rubricFilter: string;
  taskName: string;
  onFormChange: (value: string) => void;
  onStreamChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onTermChange: (value: string) => void;
  onAssessmentTypeChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onRubricFilterChange: (value: string) => void;
  onTaskNameChange: (value: string) => void;
}

export interface ProgressStripProps {
  counts: Record<string, number>;
  totalStudents: number;
  completionPct: number;
}

export interface BulkBarProps {
  bulkMode: boolean;
  selectedCount: number;
  onSelectAll: (checked: boolean) => void;
  onBulkSet: (level: string) => void;
  onClearSelected: () => void;
}

// ---------------------------------------------------------------------------
// Filter Bar Component
// ---------------------------------------------------------------------------

export function UltraCBCFilterBar({
  forms,
  streams,
  subjects,
  terms,
  selForm,
  selStream,
  selSubject,
  selTerm,
  selAssessmentType,
  searchQuery,
  rubricFilter,
  taskName,
  onFormChange,
  onStreamChange,
  onSubjectChange,
  onTermChange,
  onAssessmentTypeChange,
  onSearchChange,
  onRubricFilterChange,
  onTaskNameChange,
}: FilterBarProps) {
  return (
    <div className="flex gap-2 flex-wrap items-end mt-3">
      {/* Form */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Form
        </label>
        <select
          value={selForm}
          onChange={(e) => onFormChange(e.target.value)}
          className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs cursor-pointer focus:outline-none focus:border-indigo-400"
        >
          <option value="">Select Form</option>
          {forms.map((f: any) => (
            <option key={f.id} value={f.id}>
              {f.form_name}
            </option>
          ))}
        </select>
      </div>

      {/* Stream */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Stream
        </label>
        <select
          value={selStream}
          onChange={(e) => onStreamChange(e.target.value)}
          className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs cursor-pointer focus:outline-none focus:border-indigo-400"
        >
          <option value="">All Streams</option>
          {streams.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.stream_name}
            </option>
          ))}
        </select>
      </div>

      {/* Subject */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Subject
        </label>
        <select
          value={selSubject}
          onChange={(e) => onSubjectChange(e.target.value)}
          disabled={!selForm}
          className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs cursor-pointer focus:outline-none focus:border-indigo-400 disabled:opacity-50"
        >
          <option value="">Select Subject</option>
          {subjects.map((s: any) => (
            <option key={s.id} value={s.id}>
              {s.subject_name}
            </option>
          ))}
        </select>
      </div>

      {/* Term */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Term
        </label>
        <select
          value={selTerm}
          onChange={(e) => onTermChange(e.target.value)}
          className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs cursor-pointer focus:outline-none focus:border-indigo-400"
        >
          <option value="">Select Term</option>
          {terms.map((t: any) => (
            <option key={t.id} value={t.id}>
              {t.term_name}
            </option>
          ))}
        </select>
      </div>

      {/* Assessment Type */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Assessment
        </label>
        <select
          value={selAssessmentType}
          onChange={(e) => onAssessmentTypeChange(e.target.value)}
          className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs cursor-pointer focus:outline-none focus:border-indigo-400"
        >
          <option value="Summative">Summative</option>
          <option value="Formative">Formative</option>
        </select>
      </div>

      {/* Task Name (Formative only) */}
      {selAssessmentType === 'Formative' && (
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            Task Name
          </label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => onTaskNameChange(e.target.value)}
            placeholder="e.g. Task 1"
            className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs w-24 focus:outline-none focus:border-indigo-400"
          />
        </div>
      )}

      {/* Divider */}
      <div className="w-px h-8 bg-gray-200 self-end" />

      {/* Search */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Search
        </label>
        <div className="flex items-center gap-1.5 py-1.5 px-2.5 bg-gray-50 border border-gray-200 rounded-md">
          <FiSearch size={13} className="text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Name or admission..."
            className="bg-transparent border-none outline-none text-xs text-gray-800 w-28"
          />
        </div>
      </div>

      {/* Rubric Filter */}
      <div className="flex flex-col gap-0.5">
        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
          Filter
        </label>
        <select
          value={rubricFilter}
          onChange={(e) => onRubricFilterChange(e.target.value)}
          className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs cursor-pointer focus:outline-none focus:border-indigo-400"
        >
          <option value="">All levels</option>
          <option value="EE">EE only</option>
          <option value="ME">ME only</option>
          <option value="AE">AE only</option>
          <option value="BE">BE only</option>
          <option value="NA">Not assessed</option>
        </select>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress Strip Component
// ---------------------------------------------------------------------------

export function UltraCBCProgressStrip({
  counts,
  totalStudents,
  completionPct,
}: ProgressStripProps) {
  const assessed = totalStudents - (counts.NA || 0);
  const barWidth = totalStudents > 0 ? Math.max(1, (assessed / totalStudents) * 100) : 0;

  return (
    <div className="flex items-center gap-3 py-2.5 px-5 bg-gray-50 border-b border-gray-100">
      <span className="text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
        <FiCheckCircle size={13} className="text-indigo-400" />
        Progress
      </span>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            background: 'linear-gradient(90deg, #6C63FF, #00D9A6)',
          }}
        />
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#1D9E75' }} />
          <b className="text-gray-700 font-medium">{counts.EE || 0}</b> EE
        </span>
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#185FA5' }} />
          <b className="text-gray-700 font-medium">{counts.ME || 0}</b> ME
        </span>
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#EF9F27' }} />
          <b className="text-gray-700 font-medium">{counts.AE || 0}</b> AE
        </span>
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#E24B4A' }} />
          <b className="text-gray-700 font-medium">{counts.BE || 0}</b> BE
        </span>
        <span className="text-[11px] text-gray-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#999' }} />
          <b className="text-gray-700 font-medium">{counts.NA || 0}</b> N/A
        </span>
        <span className="text-[11px] text-gray-500 ml-2">
          <b className="text-gray-700 font-medium">{completionPct}%</b> complete
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk Selection Bar Component
// ---------------------------------------------------------------------------

export function UltraCBCBulkBar({
  bulkMode,
  selectedCount,
  onSelectAll,
  onBulkSet,
  onClearSelected,
}: BulkBarProps) {
  if (!bulkMode) return null;

  const rubricBtnStyle = (level: string) => {
    const map: Record<string, { bg: string; color: string; border: string }> = {
      EE: { bg: '#E1F5EE', color: '#0F6E56', border: '#0F6E56' },
      ME: { bg: '#E6F1FB', color: '#185FA5', border: '#185FA5' },
      AE: { bg: '#FAEEDA', color: '#854F0B', border: '#854F0B' },
      BE: { bg: '#FCEBEB', color: '#A32D2D', border: '#A32D2D' },
    };
    return map[level] || { bg: '#f3f4f6', color: '#666', border: '#ddd' };
  };

  return (
    <div
      className="flex items-center gap-2 py-2 px-5 border-b text-xs"
      style={{ backgroundColor: '#E6F1FB', borderColor: '#B5D4F4', color: '#185FA5' }}
    >
      <input
        type="checkbox"
        onChange={(e) => onSelectAll(e.target.checked)}
        className="w-3.5 h-3.5 cursor-pointer"
        style={{ accentColor: '#6C63FF' }}
      />
      <span className="font-semibold">{selectedCount} selected</span>
      <span className="flex-1" />
      <span className="text-[11px] mr-1.5">Bulk set level:</span>
      {(['EE', 'ME', 'AE', 'BE'] as const).map((lvl) => {
        const s = rubricBtnStyle(lvl);
        return (
          <button
            key={lvl}
            onClick={() => onBulkSet(lvl)}
            className="w-9 h-7 rounded-md border text-[11px] font-semibold cursor-pointer transition-all hover:opacity-80"
            style={{
              backgroundColor: s.bg,
              color: s.color,
              borderColor: s.border,
            }}
          >
            {lvl}
          </button>
        );
      })}
      <button
        onClick={onClearSelected}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-gray-300 bg-white text-gray-600 text-[11px] hover:bg-gray-50 cursor-pointer ml-2"
      >
        <FiX size={12} />
        Clear selected
      </button>
    </div>
  );
}

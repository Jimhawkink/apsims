'use client';

import { memo, useCallback } from 'react';
import {
  FiUser,
  FiActivity,
  FiTrash2,
  FiTrendingUp,
  FiTrendingDown,
  FiMinus,
} from 'react-icons/fi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudentRowData {
  id: number;
  admNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  stream: string;
  streamName: string;
}

export interface StudentRowProps {
  /** Student data */
  student: StudentRowData;
  /** Row index (1-based) */
  index: number;
  /** Current numeric score string */
  score: string;
  /** Current rubric level or null */
  level: string | null;
  /** Previous term's rubric level or null */
  prevLevel: string | null;
  /** Formative average level or null */
  formativeAvgLevel: string | null;
  /** Teacher note text */
  note: string;
  /** Rubric config for auto-note placeholders */
  rubricConfig: any[];
  /** Whether bulk mode is active */
  bulkMode: boolean;
  /** Whether this row is selected in bulk mode */
  isSelected: boolean;
  /** Callback when score changes */
  onScoreChange: (studentId: number, value: string) => void;
  /** Callback when rubric level is manually set */
  onLevelChange: (studentId: number, level: string) => void;
  /** Callback to clear a student's marks */
  onClear: (studentId: number) => void;
  /** Callback when teacher note changes */
  onNoteChange: (studentId: number, value: string) => void;
  /** Callback when bulk checkbox toggled */
  onCheckChange: (studentId: number, checked: boolean) => void;
}

// ---------------------------------------------------------------------------
// Rubric colors
// ---------------------------------------------------------------------------

const RUBRIC_COLORS: Record<string, {
  bg: string; color: string; border: string;
  selectedBg: string; selectedColor: string; selectedBorder: string;
}> = {
  EE: {
    bg: 'transparent', color: '#9ca3af', border: '#e5e7eb',
    selectedBg: '#E1F5EE', selectedColor: '#0F6E56', selectedBorder: '#0F6E56',
  },
  ME: {
    bg: 'transparent', color: '#9ca3af', border: '#e5e7eb',
    selectedBg: '#E6F1FB', selectedColor: '#185FA5', selectedBorder: '#185FA5',
  },
  AE: {
    bg: 'transparent', color: '#9ca3af', border: '#e5e7eb',
    selectedBg: '#FAEEDA', selectedColor: '#854F0B', selectedBorder: '#854F0B',
  },
  BE: {
    bg: 'transparent', color: '#9ca3af', border: '#e5e7eb',
    selectedBg: '#FCEBEB', selectedColor: '#A32D2D', selectedBorder: '#A32D2D',
  },
};

const LEVEL_BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  EE: { bg: '#E1F5EE', color: '#0F6E56' },
  ME: { bg: '#E6F1FB', color: '#185FA5' },
  AE: { bg: '#FAEEDA', color: '#854F0B' },
  BE: { bg: '#FCEBEB', color: '#A32D2D' },
};

const AVATAR_COLORS = [
  '#6C63FF', '#00D9A6', '#FF6B6B', '#FFD60A',
  '#378ADD', '#1D9E75', '#EF9F27', '#D4537E',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getInitials(firstName: string, lastName: string): string {
  return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
}

function getAvatarColor(index: number): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

/** Compute trend direction from current level vs previous */
function computeTrend(
  current: string | null,
  prev: string | null
): 'up' | 'down' | 'flat' {
  if (!current || !prev) return 'flat';
  const order = ['EE', 'ME', 'AE', 'BE'];
  const ci = order.indexOf(current);
  const pi = order.indexOf(prev);
  if (ci < 0 || pi < 0) return 'flat';
  if (ci < pi) return 'up';   // lower index = better level
  if (ci > pi) return 'down';
  return 'flat';
}

// ---------------------------------------------------------------------------
// Level Badge Sub-component
// ---------------------------------------------------------------------------

function LevelBadge({ level }: { level: string | null }) {
  if (!level) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
        style={{ backgroundColor: '#f3f4f6', color: '#9ca3af' }}
      >
        —
      </span>
    );
  }
  const style = LEVEL_BADGE_STYLES[level] || { bg: '#f3f4f6', color: '#9ca3af' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold"
      style={{ backgroundColor: style.bg, color: style.color }}
    >
      {level}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Trend Icon Sub-component
// ---------------------------------------------------------------------------

function TrendIcon({ direction }: { direction: 'up' | 'down' | 'flat' }) {
  if (direction === 'up') {
    return (
      <span className="flex items-center gap-0.5 text-[11px]" style={{ color: '#1D9E75' }}>
        <FiTrendingUp size={13} />
      </span>
    );
  }
  if (direction === 'down') {
    return (
      <span className="flex items-center gap-0.5 text-[11px]" style={{ color: '#E24B4A' }}>
        <FiTrendingDown size={13} />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-[11px] text-gray-400">
      <FiMinus size={13} />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

function UltraCBCStudentRow({
  student,
  index,
  score,
  level,
  prevLevel,
  formativeAvgLevel,
  note,
  rubricConfig,
  bulkMode,
  isSelected,
  onScoreChange,
  onLevelChange,
  onClear,
  onNoteChange,
  onCheckChange,
}: StudentRowProps) {
  const avatarColor = getAvatarColor(index - 1);
  const initials = getInitials(student.firstName, student.lastName);
  const trend = computeTrend(level, prevLevel);

  // Derive auto-note for current level from rubric config
  const autoNote = level
    ? (() => {
        const cfg = (rubricConfig || []).find(
          (r: any) => r.level_code === level || r.rubric_level === level
        );
        return cfg?.teacher_note || cfg?.default_note || cfg?.note || cfg?.description || '';
      })()
    : '';

  const handleScoreInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onScoreChange(student.id, e.target.value);
    },
    [student.id, onScoreChange]
  );

  const handleNoteInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onNoteChange(student.id, e.target.value);
    },
    [student.id, onNoteChange]
  );

  const handleCheckboxChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onCheckChange(student.id, e.target.checked);
    },
    [student.id, onCheckChange]
  );

  // Reset note to the auto-note for the current level
  const handleResetNote = useCallback(() => {
    if (autoNote) onNoteChange(student.id, autoNote);
  }, [student.id, autoNote, onNoteChange]);

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors group">
      {/* Bulk checkbox column */}
      {bulkMode && (
        <td className="px-3 py-1.5">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleCheckboxChange}
            className="w-3.5 h-3.5 cursor-pointer rounded"
            style={{ accentColor: '#6C63FF' }}
          />
        </td>
      )}

      {/* Row number */}
      <td className="px-3 py-1.5 text-xs text-gray-400">{index}</td>

      {/* Student info */}
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-2">
          <div
            className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
            style={{
              backgroundColor: `${avatarColor}22`,
              color: avatarColor,
            }}
          >
            {initials}
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-800">
              {student.firstName} {student.lastName}
            </div>
            <div className="text-[10px] text-gray-400">{student.admNo}</div>
          </div>
        </div>
      </td>

      {/* Marks input */}
      <td className="px-3 py-1.5">
        <input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={handleScoreInput}
          placeholder="0–100"
          className="w-[52px] py-1 px-1.5 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-xs text-center transition-all focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </td>

      {/* Rubric level buttons */}
      <td className="px-3 py-1.5">
        <div className="flex gap-1">
          {(['EE', 'ME', 'AE', 'BE'] as const).map((lvl) => {
            const isActive = level === lvl;
            const colors = RUBRIC_COLORS[lvl];
            return (
              <button
                key={lvl}
                onClick={() => onLevelChange(student.id, lvl)}
                className="w-9 h-7 rounded-md border text-[11px] font-semibold cursor-pointer transition-all hover:opacity-80"
                style={{
                  backgroundColor: isActive ? colors.selectedBg : colors.bg,
                  color: isActive ? colors.selectedColor : colors.color,
                  borderColor: isActive ? colors.selectedBorder : colors.border,
                }}
              >
                {lvl}
              </button>
            );
          })}
        </div>
      </td>

      {/* Current level badge */}
      <td className="px-3 py-1.5">
        <LevelBadge level={level} />
      </td>

      {/* Previous term level */}
      <td className="px-3 py-1.5">
        <LevelBadge level={prevLevel} />
      </td>

      {/* Trend arrow */}
      <td className="px-3 py-1.5">
        <TrendIcon direction={trend} />
      </td>

      {/* Formative average */}
      <td className="px-3 py-1.5">
        <LevelBadge level={formativeAvgLevel} />
      </td>

      {/* Teacher note */}
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={note}
            onChange={handleNoteInput}
            placeholder={autoNote || 'Note...'}
            title={autoNote ? `Auto-note for ${level}: "${autoNote}"` : 'Teacher note'}
            className="w-full py-1 px-1.5 rounded-md border border-gray-200 bg-gray-50 text-gray-800 text-[11px] transition-all focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          {autoNote && note !== autoNote && (
            <button
              onClick={handleResetNote}
              title={`Reset to: "${autoNote}"`}
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold border border-indigo-200 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer"
            >
              ↺
            </button>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="px-3 py-1.5">
        <div className="flex gap-1 items-center">
          <button
            className="w-7 h-7 rounded-md border border-gray-200 bg-transparent flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer"
            title="View profile"
          >
            <FiUser size={13} />
          </button>
          <button
            className="w-7 h-7 rounded-md border border-gray-200 bg-transparent flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-all cursor-pointer"
            title="Competency detail"
          >
            <FiActivity size={13} />
          </button>
          <button
            onClick={() => onClear(student.id)}
            className="w-7 h-7 rounded-md border border-gray-200 bg-transparent flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer"
            title="Clear marks"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default memo(UltraCBCStudentRow);

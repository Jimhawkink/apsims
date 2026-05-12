'use client';

import { useMemo } from 'react';
import {
  FiPieChart,
  FiBarChart2,
  FiAlertTriangle,
  FiTrendingUp,
  FiInfo,
  FiClock,
  FiFlag,
  FiPrinter,
  FiActivity,
} from 'react-icons/fi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsPanelProps {
  /** Total number of students in the class */
  totalStudents: number;
  /** Object mapping student IDs to their current rubric level or null */
  marks: Record<number, string | null>;
  /** Object mapping student IDs to their numeric score or empty string */
  scores: Record<number, string>;
  /** Rubric config from DB */
  rubricConfig: any[];
  /** Formatted subject name */
  subjectName: string;
  /** Formatted term name */
  termName: string;
  /** Number of days until deadline (null = no deadline info) */
  deadlineDays: number | null;
  /** Students flagged as BE */
  beStudentNames: string[];
  /** Mini chart data for trend visualization */
  trendData: { label: string; value: number; color: string }[];
}

// ---------------------------------------------------------------------------
// Rubric color palette
// ---------------------------------------------------------------------------

const RUBRIC_COLORS: Record<string, { bar: string; text: string; bg: string; border: string }> = {
  EE: { bar: '#1D9E75', text: '#0F6E56', bg: '#E1F5EE', border: '#0F6E56' },
  ME: { bar: '#378ADD', text: '#185FA5', bg: '#E6F1FB', border: '#185FA5' },
  AE: { bar: '#EF9F27', text: '#854F0B', bg: '#FAEEDA', border: '#854F0B' },
  BE: { bar: '#E24B4A', text: '#A32D2D', bg: '#FCEBEB', border: '#A32D2D' },
};

const RUBRIC_GUIDE = [
  { code: 'EE', label: 'Exceeds Expectation', range: '80–100' },
  { code: 'ME', label: 'Meets Expectation', range: '60–79' },
  { code: 'AE', label: 'Approaches Expectation', range: '40–59' },
  { code: 'BE', label: 'Below Expectation', range: '0–39' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UltraCBCAnalyticsPanel({
  totalStudents,
  marks,
  scores,
  rubricConfig,
  subjectName,
  termName,
  deadlineDays,
  beStudentNames,
  trendData,
}: AnalyticsPanelProps) {
  // -----------------------------------------------------------------------
  // Computed analytics
  // -----------------------------------------------------------------------

  const analytics = useMemo(() => {
    const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0, NA: 0 };
    let scoreSum = 0;
    let scoreCount = 0;

    Object.entries(marks).forEach(([idStr, level]) => {
      if (level && counts[level] !== undefined) {
        counts[level]++;
      } else {
        counts.NA++;
      }
    });

    // Also count students with no entry at all
    const enteredStudentCount = Object.keys(marks).length;
    if (totalStudents > enteredStudentCount) {
      counts.NA += totalStudents - enteredStudentCount;
    }

    Object.entries(scores).forEach(([idStr, val]) => {
      const num = parseFloat(val);
      if (!isNaN(num) && val !== '') {
        scoreSum += num;
        scoreCount++;
      }
    });

    const assessed = totalStudents - counts.NA;
    const meanScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : null;
    const topLevel = counts.EE > 0 ? 'EE' : counts.ME > 0 ? 'ME' : counts.AE > 0 ? 'AE' : counts.BE > 0 ? 'BE' : null;
    const completionPct = totalStudents > 0 ? Math.round((assessed / totalStudents) * 100) : 0;

    return { counts, assessed, meanScore, topLevel, completionPct };
  }, [marks, scores, totalStudents]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="w-[260px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col gap-0 overflow-auto">

      {/* ----------------------------------------------------------------- */}
      {/* SECTION: Class Overview Stats */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <FiPieChart size={13} className="text-indigo-500" />
          Class Overview
        </div>
        <div className="grid grid-cols-2 gap-2">
          {/* Assessed */}
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-gray-800">{analytics.assessed}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Assessed</div>
          </div>
          {/* Total */}
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-gray-800">{totalStudents}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">Total</div>
          </div>
          {/* Mean Score */}
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-gray-800">
              {analytics.meanScore !== null ? analytics.meanScore : '—'}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">Mean Score</div>
          </div>
          {/* Top Level */}
          <div className="bg-gray-50 rounded-lg p-2.5 text-center">
            <div className="text-xl font-bold text-gray-800">
              {analytics.topLevel || '—'}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">Top Level</div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION: Rubric Distribution Bars */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <FiBarChart2 size={13} className="text-indigo-500" />
          Rubric Distribution
        </div>
        <div className="flex flex-col gap-1.5">
          {(['EE', 'ME', 'AE', 'BE'] as const).map((level) => {
            const count = analytics.counts[level] || 0;
            const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
            const colors = RUBRIC_COLORS[level];
            return (
              <div key={level} className="flex items-center gap-2">
                <span
                  className="w-6 text-[11px] font-bold"
                  style={{ color: colors.text }}
                >
                  {level}
                </span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: colors.bar,
                      minWidth: count > 0 ? '4px' : '0',
                    }}
                  />
                </div>
                <span className="w-7 text-right text-[11px] text-gray-500">
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION: Alerts */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <FiAlertTriangle size={13} className="text-amber-500" />
          Alerts
        </div>

        {/* Deadline Warning */}
        {deadlineDays !== null && (
          <div
            className="flex items-start gap-2 p-2.5 rounded-lg border text-xs mb-2"
            style={{
              backgroundColor: '#FAEEDA',
              borderColor: '#EF9F27',
              color: '#854F0B',
            }}
          >
            <FiClock size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <b>Deadline:</b> {termName} marks submission closes in{' '}
              <b>{deadlineDays} day{deadlineDays !== 1 ? 's' : ''}</b>.
            </div>
          </div>
        )}

        {/* BE Alert */}
        {beStudentNames.length > 0 && (
          <div
            className="flex items-start gap-2 p-2.5 rounded-lg border text-xs"
            style={{
              backgroundColor: '#E6F1FB',
              borderColor: '#378ADD',
              color: '#185FA5',
            }}
          >
            <FiFlag size={14} className="flex-shrink-0 mt-0.5" />
            <div>
              <b>{beStudentNames.length} student{beStudentNames.length > 1 ? 's' : ''}</b>{' '}
              rated BE — consider intervention.
            </div>
          </div>
        )}

        {/* All clear */}
        {beStudentNames.length === 0 && deadlineDays === null && (
          <div className="text-xs text-gray-400 text-center py-2">
            No active alerts
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION: Score Trends Mini Chart */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <FiTrendingUp size={13} className="text-green-500" />
          Score Trends (Term)
        </div>
        {trendData.length > 0 ? (
          <>
            <div className="h-[60px] flex items-end gap-1 px-0.5">
              {trendData.map((item, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t transition-all duration-500"
                  style={{
                    height: `${item.value}%`,
                    backgroundColor: item.color,
                    minHeight: '4px',
                  }}
                />
              ))}
            </div>
            <div className="flex gap-1 mt-1">
              {trendData.map((item, i) => (
                <span key={i} className="flex-1 text-center text-[9px] text-gray-400">
                  {item.label}
                </span>
              ))}
            </div>
          </>
        ) : (
          <div className="h-[60px] flex items-center justify-center text-xs text-gray-400">
            No trend data available
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION: Rubric Guide */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          <FiInfo size={13} className="text-indigo-500" />
          Rubric Guide
        </div>
        <div className="flex flex-col gap-1.5">
          {RUBRIC_GUIDE.map((item) => {
            const colors = RUBRIC_COLORS[item.code];
            return (
              <div key={item.code} className="flex items-start gap-2 text-[11px]">
                <span
                  className="inline-block px-2 py-0.5 rounded font-bold text-[10px]"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                  }}
                >
                  {item.code}
                </span>
                <span className="text-gray-500">
                  {item.label}
                  <br />
                  <b className="text-gray-700">{item.range}</b>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SECTION: Action Buttons */}
      {/* ----------------------------------------------------------------- */}
      <div className="p-4">
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #6C63FF, #5a52e0)' }}
        >
          <FiPrinter size={13} />
          Generate Report Cards
        </button>
        <button
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-700 bg-white border border-gray-200 mt-2 transition-all hover:bg-gray-50"
        >
          <FiActivity size={13} />
          Competency Gap Analysis
        </button>
      </div>
    </div>
  );
}

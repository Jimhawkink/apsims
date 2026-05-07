'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import RubricLevelBadge from './RubricLevelBadge';

type RubricLevel = 'EE' | 'ME' | 'AE' | 'BE';

interface CBCMarksGridProps {
  students: any[];
  subjectId: number;
  termId: number;
  assessmentType: 'Formative' | 'Summative';
  taskName: string;
  rubricConfig: any[];
  existingAssessments: any[];
  onSave: (
    studentId: number,
    level: RubricLevel,
    taskName: string
  ) => Promise<void>;
  saving?: boolean;
}

const RUBRIC_LEVELS: RubricLevel[] = ['EE', 'ME', 'AE', 'BE'];

/** Hardcoded button colors for the toggle buttons (used when rubricConfig is empty). */
const LEVEL_BUTTON_STYLES: Record<
  RubricLevel,
  { active: string; inactive: string }
> = {
  EE: {
    active: 'bg-green-600 text-white border-green-600',
    inactive: 'bg-white text-green-700 border-green-300 hover:bg-green-50',
  },
  ME: {
    active: 'bg-blue-600 text-white border-blue-600',
    inactive: 'bg-white text-blue-700 border-blue-300 hover:bg-blue-50',
  },
  AE: {
    active: 'bg-amber-600 text-white border-amber-600',
    inactive: 'bg-white text-amber-700 border-amber-300 hover:bg-amber-50',
  },
  BE: {
    active: 'bg-red-600 text-white border-red-600',
    inactive: 'bg-white text-red-700 border-red-300 hover:bg-red-50',
  },
};

/**
 * Broadsheet-style CBC marks entry grid.
 * Each student row has EE/ME/AE/BE toggle buttons.
 * Auto-saves after 2-second idle per cell change.
 * Shows confirmation dialog when overwriting a Summative assessment.
 */
export default function CBCMarksGrid({
  students,
  subjectId,
  termId,
  assessmentType,
  taskName,
  rubricConfig,
  existingAssessments,
  onSave,
  saving = false,
}: CBCMarksGridProps) {
  // Local state: studentId → selected level
  const [selections, setSelections] = useState<Record<number, RubricLevel | null>>({});
  // Track which cells are pending save (debounce timers)
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // Track saving state per student
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    studentId: number;
    level: RubricLevel;
  } | null>(null);

  // Initialize selections from existingAssessments
  useEffect(() => {
    const initial: Record<number, RubricLevel | null> = {};
    for (const student of students) {
      const existing = existingAssessments.find(
        (a: any) =>
          a.student_id === student.id &&
          a.subject_id === subjectId &&
          a.term_id === termId &&
          a.assessment_type === assessmentType &&
          (assessmentType === 'Summative' || a.task_name === taskName)
      );
      initial[student.id] = existing ? (existing.rubric_level as RubricLevel) : null;
    }
    setSelections(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, existingAssessments, subjectId, termId, assessmentType, taskName]);

  const hasExistingSummative = useCallback(
    (studentId: number) => {
      if (assessmentType !== 'Summative') return false;
      return existingAssessments.some(
        (a: any) =>
          a.student_id === studentId &&
          a.subject_id === subjectId &&
          a.term_id === termId &&
          a.assessment_type === 'Summative'
      );
    },
    [existingAssessments, subjectId, termId, assessmentType]
  );

  const doSave = useCallback(
    async (studentId: number, level: RubricLevel) => {
      setSavingIds((prev) => new Set(prev).add(studentId));
      try {
        await onSave(studentId, level, taskName);
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(studentId);
          return next;
        });
      }
    },
    [onSave, taskName]
  );

  const scheduleAutoSave = useCallback(
    (studentId: number, level: RubricLevel) => {
      // Clear any existing timer for this student
      if (timers.current[studentId]) {
        clearTimeout(timers.current[studentId]);
      }
      timers.current[studentId] = setTimeout(() => {
        doSave(studentId, level);
      }, 2000);
    },
    [doSave]
  );

  const handleLevelSelect = (studentId: number, level: RubricLevel) => {
    // If same level clicked, deselect
    if (selections[studentId] === level) {
      setSelections((prev) => ({ ...prev, [studentId]: null }));
      if (timers.current[studentId]) clearTimeout(timers.current[studentId]);
      return;
    }

    // Check if overwriting an existing summative
    if (hasExistingSummative(studentId) && selections[studentId] !== null) {
      setConfirmDialog({ studentId, level });
      return;
    }

    setSelections((prev) => ({ ...prev, [studentId]: level }));
    scheduleAutoSave(studentId, level);
  };

  const handleConfirmOverwrite = () => {
    if (!confirmDialog) return;
    const { studentId, level } = confirmDialog;
    setSelections((prev) => ({ ...prev, [studentId]: level }));
    scheduleAutoSave(studentId, level);
    setConfirmDialog(null);
  };

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timers.current).forEach(clearTimeout);
    };
  }, []);

  const assessedCount = Object.values(selections).filter((v) => v !== null).length;
  const totalCount = students.length;

  return (
    <div className="space-y-3">
      {/* Completion indicator */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{
                width: totalCount > 0 ? `${(assessedCount / totalCount) * 100}%` : '0%',
              }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600">
            {assessedCount} / {totalCount} students assessed
          </span>
        </div>
        {saving && (
          <span className="text-xs text-indigo-500 font-medium animate-pulse">
            Saving…
          </span>
        )}
      </div>

      {/* Grid table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase w-10">
                  #
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">
                  Student Name
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase w-28">
                  Adm No
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase">
                  Rubric Level
                </th>
                <th className="px-3 py-2.5 text-center text-xs font-bold text-gray-500 uppercase w-24">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student: any, index: number) => {
                const currentLevel = selections[student.id] ?? null;
                const isSaving = savingIds.has(student.id);

                return (
                  <tr
                    key={student.id}
                    className="border-b border-gray-100 hover:bg-indigo-50/20 transition-colors"
                  >
                    {/* Row number */}
                    <td className="px-3 py-2.5 text-xs text-gray-400 font-medium">
                      {index + 1}
                    </td>

                    {/* Student name */}
                    <td className="px-3 py-2.5">
                      <span className="text-sm font-semibold text-gray-800">
                        {student.first_name} {student.last_name}
                      </span>
                    </td>

                    {/* Admission number */}
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-bold text-blue-600">
                        {student.admission_no || student.admission_number || '—'}
                      </span>
                    </td>

                    {/* EE/ME/AE/BE toggle buttons */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        {RUBRIC_LEVELS.map((level) => {
                          const isActive = currentLevel === level;
                          const styles = LEVEL_BUTTON_STYLES[level];
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => handleLevelSelect(student.id, level)}
                              disabled={isSaving}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400 disabled:opacity-50 ${
                                isActive ? styles.active : styles.inactive
                              }`}
                            >
                              {level}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2.5 text-center">
                      {isSaving ? (
                        <span className="text-[10px] font-bold text-indigo-500 animate-pulse">
                          Saving…
                        </span>
                      ) : currentLevel ? (
                        <RubricLevelBadge
                          level={currentLevel}
                          rubricConfig={rubricConfig}
                          size="sm"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {students.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-gray-400"
                  >
                    No students found for this subject combination.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summative overwrite confirmation dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-gray-200">
            <h3 className="text-sm font-bold text-gray-800 mb-2">
              Overwrite Summative Assessment?
            </h3>
            <p className="text-xs text-gray-600 mb-5">
              A summative assessment already exists for this student. Are you sure you
              want to overwrite it with{' '}
              <span className="font-bold text-indigo-600">{confirmDialog.level}</span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

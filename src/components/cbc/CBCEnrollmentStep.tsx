'use client';
import { useMemo } from 'react';
import { countElectivesForPathway } from '../../lib/cbc-utils';
import PathwayBadge from './PathwayBadge';

interface CBCEnrollmentStepProps {
  pathways: any[];
  pathwaySubjects: any[];
  allSubjects: any[];
  selectedPathwayId: number | null;
  selectedElectives: number[];
  onPathwayChange: (id: number) => void;
  onElectivesChange: (ids: number[]) => void;
}

/**
 * CBC enrollment step component.
 * Shows 3 pathway cards with radio-style selection.
 * When a pathway is selected, shows 4 compulsory subjects as read-only chips
 * and elective subjects as checkboxes (max 3 selectable).
 */
export default function CBCEnrollmentStep({
  pathways,
  pathwaySubjects,
  allSubjects,
  selectedPathwayId,
  selectedElectives,
  onPathwayChange,
  onElectivesChange,
}: CBCEnrollmentStepProps) {
  // Compulsory subjects: is_compulsory = true (shared across all pathways)
  const compulsorySubjectIds = useMemo(() => {
    const ids = new Set<number>();
    pathwaySubjects
      .filter((ps: any) => ps.is_compulsory)
      .forEach((ps: any) => ids.add(ps.subject_id));
    return ids;
  }, [pathwaySubjects]);

  const compulsorySubjects = useMemo(
    () => allSubjects.filter((s: any) => compulsorySubjectIds.has(s.id)),
    [allSubjects, compulsorySubjectIds]
  );

  // Elective subjects for the selected pathway
  const electiveSubjects = useMemo(() => {
    if (!selectedPathwayId) return [];
    const electiveIds = pathwaySubjects
      .filter((ps: any) => ps.pathway_id === selectedPathwayId && !ps.is_compulsory)
      .map((ps: any) => ps.subject_id);
    return allSubjects.filter((s: any) => electiveIds.includes(s.id));
  }, [selectedPathwayId, pathwaySubjects, allSubjects]);

  const toggleElective = (subjectId: number) => {
    if (selectedElectives.includes(subjectId)) {
      onElectivesChange(selectedElectives.filter((id) => id !== subjectId));
    } else {
      onElectivesChange([...selectedElectives, subjectId]);
    }
  };

  const showElectiveError =
    selectedPathwayId !== null && selectedElectives.length !== 3;

  return (
    <div className="space-y-5">
      {/* Step header */}
      <div>
        <h3 className="text-sm font-bold text-gray-800 mb-1">Select Pathway</h3>
        <p className="text-xs text-gray-500">
          Choose one of the three CBC Senior School pathways. The student will study 4
          compulsory subjects plus 3 electives from the chosen pathway.
        </p>
      </div>

      {/* Pathway cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {pathways.map((pathway: any) => {
          const electiveCount = countElectivesForPathway(pathway.id, pathwaySubjects);
          const isSelected = selectedPathwayId === pathway.id;
          const hasWarning = electiveCount < 3;

          return (
            <button
              key={pathway.id}
              type="button"
              onClick={() => {
                onPathwayChange(pathway.id);
                // Clear electives when pathway changes
                onElectivesChange([]);
              }}
              className={`relative text-left p-4 rounded-2xl border-2 transition-all cursor-pointer focus:outline-none ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              {/* Radio indicator */}
              <div className="flex items-start justify-between mb-2">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300 bg-white'
                  }`}
                >
                  {isSelected && (
                    <div className="w-full h-full rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    </div>
                  )}
                </div>
                {hasWarning && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                    ⚠ &lt;3 electives
                  </span>
                )}
              </div>

              <PathwayBadge
                pathwayName={pathway.pathway_name}
                colorHex={pathway.color_hex}
              />

              <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                {pathway.description || pathway.pathway_name + ' pathway'}
              </p>

              <p className="mt-1.5 text-[10px] font-semibold text-gray-400">
                {electiveCount} elective{electiveCount !== 1 ? 's' : ''} available
              </p>
            </button>
          );
        })}
      </div>

      {/* Subject combination (shown when pathway is selected) */}
      {selectedPathwayId !== null && (
        <div className="space-y-4">
          {/* Compulsory subjects */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
              Compulsory Subjects (4) — All students
            </h4>
            <div className="flex flex-wrap gap-2">
              {compulsorySubjects.length > 0 ? (
                compulsorySubjects.map((subject: any) => (
                  <span
                    key={subject.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200"
                  >
                    ✓ {subject.subject_name}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-400 italic">
                  No compulsory subjects configured
                </span>
              )}
            </div>
          </div>

          {/* Elective subjects */}
          <div>
            <h4 className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">
              Elective Subjects — Select exactly 3
            </h4>

            {electiveSubjects.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                No elective subjects are configured for this pathway. Please contact the
                administrator.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {electiveSubjects.map((subject: any) => {
                  const isChecked = selectedElectives.includes(subject.id);
                  const isDisabled = !isChecked && selectedElectives.length >= 3;

                  return (
                    <label
                      key={subject.id}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? 'border-indigo-400 bg-indigo-50'
                          : isDisabled
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => toggleElective(subject.id)}
                        className="w-4 h-4 rounded text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      <span className="text-xs font-medium text-gray-700">
                        {subject.subject_name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Elective count indicator */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className={`w-2 h-2 rounded-full ${
                      selectedElectives.length >= n ? 'bg-indigo-500' : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-500">
                {selectedElectives.length} / 3 selected
              </span>
            </div>

            {/* Inline error */}
            {showElectiveError && selectedElectives.length > 0 && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                Please select exactly 3 elective subjects from your chosen pathway
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

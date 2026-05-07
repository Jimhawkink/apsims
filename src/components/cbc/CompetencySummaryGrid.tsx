'use client';
import RubricLevelBadge from './RubricLevelBadge';

type RubricLevel = 'EE' | 'ME' | 'AE' | 'BE';

interface CompetencySummaryGridProps {
  students: any[];
  subjects: any[];
  summaries: any[];
  rubricConfig: any[];
}

const RUBRIC_LEVELS: RubricLevel[] = ['EE', 'ME', 'AE', 'BE'];

/**
 * Matrix grid: rows = students, columns = subjects.
 * Each cell shows a RubricLevelBadge for that student/subject.
 * Bottom row shows distribution counts (EE/ME/AE/BE count per subject column).
 * Scrollable horizontally.
 */
export default function CompetencySummaryGrid({
  students,
  subjects,
  summaries,
  rubricConfig,
}: CompetencySummaryGridProps) {
  /** Look up the overall_level for a given student + subject. */
  const getLevel = (studentId: number, subjectId: number): RubricLevel | null => {
    const summary = summaries.find(
      (s: any) => s.student_id === studentId && s.subject_id === subjectId
    );
    return summary?.overall_level ?? null;
  };

  /** Count how many students have a given level for a subject. */
  const countLevel = (subjectId: number, level: RubricLevel): number => {
    return summaries.filter(
      (s: any) => s.subject_id === subjectId && s.overall_level === level
    ).length;
  };

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        No students to display.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {/* Student column header */}
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase sticky left-0 bg-gray-50 z-10 min-w-[180px] border-r border-gray-200">
                Student
              </th>
              {/* Subject column headers */}
              {subjects.map((subject: any) => (
                <th
                  key={subject.id}
                  className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase min-w-[100px]"
                >
                  <span className="block truncate max-w-[90px]" title={subject.subject_name}>
                    {subject.subject_name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Student rows */}
            {students.map((student: any, index: number) => (
              <tr
                key={student.id}
                className={`border-b border-gray-100 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } hover:bg-indigo-50/20 transition-colors`}
              >
                {/* Student name + adm no */}
                <td className="px-4 py-2.5 sticky left-0 bg-inherit z-10 border-r border-gray-200">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-800 truncate max-w-[160px]">
                      {student.first_name} {student.last_name}
                    </span>
                    <span className="text-[10px] text-blue-500 font-medium">
                      {student.admission_no || student.admission_number || ''}
                    </span>
                  </div>
                </td>

                {/* Level cells */}
                {subjects.map((subject: any) => {
                  const level = getLevel(student.id, subject.id);
                  return (
                    <td key={subject.id} className="px-3 py-2.5 text-center">
                      <RubricLevelBadge
                        level={level}
                        rubricConfig={rubricConfig}
                        size="sm"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            {/* Distribution row */}
            <tr className="border-t-2 border-gray-300 bg-gray-100">
              <td className="px-4 py-2.5 sticky left-0 bg-gray-100 z-10 border-r border-gray-200">
                <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">
                  Distribution
                </span>
              </td>
              {subjects.map((subject: any) => (
                <td key={subject.id} className="px-3 py-2.5 text-center">
                  <div className="flex flex-col gap-0.5 items-center">
                    {RUBRIC_LEVELS.map((level) => {
                      const count = countLevel(subject.id, level);
                      if (count === 0) return null;
                      return (
                        <div key={level} className="flex items-center gap-1">
                          <RubricLevelBadge
                            level={level}
                            rubricConfig={rubricConfig}
                            size="sm"
                          />
                          <span className="text-[10px] font-bold text-gray-600">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                    {RUBRIC_LEVELS.every((l) => countLevel(subject.id, l) === 0) && (
                      <span className="text-[10px] text-gray-400">—</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

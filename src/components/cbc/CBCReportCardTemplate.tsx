'use client';
import RubricLevelBadge from './RubricLevelBadge';
import PathwayBadge from './PathwayBadge';

interface CBCReportCardTemplateProps {
  student: any;
  pathway: any;
  subjects: any[];
  summaries: any[];
  rubricConfig: any[];
  schoolDetails: any;
  term: any;
  comments: any;
}

/**
 * Print-ready CBC Senior School report card template.
 * Displays rubric levels (EE/ME/AE/BE) — NO percentage scores, NO A–E grades.
 * Uses @media print CSS for clean printing.
 */
export default function CBCReportCardTemplate({
  student,
  pathway,
  subjects,
  summaries,
  rubricConfig,
  schoolDetails,
  term,
  comments,
}: CBCReportCardTemplateProps) {
  /** Look up the overall_level for a given subject. */
  const getSummaryLevel = (subjectId: number) => {
    const summary = summaries.find(
      (s: any) => s.subject_id === subjectId && s.student_id === student?.id
    );
    return summary?.overall_level ?? null;
  };

  const studentName = student
    ? `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim()
    : '—';

  const admissionNo =
    student?.admission_no || student?.admission_number || '—';

  const streamName =
    student?.stream_name ||
    student?.stream?.stream_name ||
    '—';

  const termName = term?.term_name || term?.name || '—';
  const academicYear = term?.academic_year || term?.year || new Date().getFullYear();

  const schoolName = schoolDetails?.school_name || schoolDetails?.name || 'School Name';
  const schoolLogo = schoolDetails?.logo_url || schoolDetails?.logo || null;
  const schoolAddress = schoolDetails?.address || schoolDetails?.school_address || '';

  return (
    <>
      {/* Print styles injected inline */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .report-card-page {
            page-break-after: always;
            margin: 0;
            padding: 20mm;
            box-shadow: none !important;
            border: none !important;
          }
          body { background: white !important; }
        }
      `}</style>

      <div className="report-card-page bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-[800px] mx-auto font-sans">

        {/* ── HEADER ── */}
        <div className="flex items-start justify-between mb-6 pb-5 border-b-2 border-gray-800">
          {/* School logo */}
          <div className="flex-shrink-0">
            {schoolLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={schoolLogo}
                alt="School Logo"
                className="w-16 h-16 object-contain rounded-lg"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-indigo-100 flex items-center justify-center">
                <span className="text-2xl font-black text-indigo-600">
                  {schoolName.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* School info */}
          <div className="flex-1 text-center px-4">
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide">
              {schoolName}
            </h1>
            {schoolAddress && (
              <p className="text-xs text-gray-500 mt-0.5">{schoolAddress}</p>
            )}
            <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-wider">
              CBC Senior School — Grade 10
            </div>
          </div>

          {/* Term info */}
          <div className="flex-shrink-0 text-right">
            <p className="text-xs font-bold text-gray-700">{termName}</p>
            <p className="text-xs text-gray-500">Academic Year {academicYear}</p>
          </div>
        </div>

        {/* ── STUDENT SECTION ── */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                Student Name
              </p>
              <p className="text-sm font-bold text-gray-900">{studentName}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                Admission No
              </p>
              <p className="text-sm font-bold text-blue-600">{admissionNo}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                Grade / Stream
              </p>
              <p className="text-sm font-semibold text-gray-800">
                Grade 10 / {streamName}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">
                Pathway
              </p>
              {pathway ? (
                <PathwayBadge
                  pathwayName={pathway.pathway_name}
                  colorHex={pathway.color_hex}
                />
              ) : (
                <span className="text-xs text-gray-400 italic">Not assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* ── SUBJECT TABLE ── */}
        <div className="mb-6">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Subject Performance
          </h2>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide w-8">
                    #
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide">
                    Subject
                  </th>
                  <th className="px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide w-32">
                    Competency Level
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-bold uppercase tracking-wide">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject: any, index: number) => {
                  const level = getSummaryLevel(subject.id);
                  const configEntry = rubricConfig?.find(
                    (c: any) => c.level_code === level
                  );
                  const levelLabel = configEntry?.level_label ?? null;

                  return (
                    <tr
                      key={subject.id}
                      className={`border-b border-gray-100 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-semibold text-gray-800">
                          {subject.subject_name}
                        </span>
                        {index < 4 && (
                          <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                            Compulsory
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <RubricLevelBadge
                          level={level}
                          rubricConfig={rubricConfig}
                          size="md"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">
                        {level && levelLabel ? levelLabel : level ? '' : 'Not Assessed'}
                      </td>
                    </tr>
                  );
                })}

                {/* Pad to 7 rows if fewer subjects provided */}
                {subjects.length < 7 &&
                  Array.from({ length: 7 - subjects.length }).map((_, i) => (
                    <tr
                      key={`empty-${i}`}
                      className={`border-b border-gray-100 ${
                        (subjects.length + i) % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                      }`}
                    >
                      <td className="px-4 py-2.5 text-xs text-gray-300">
                        {subjects.length + i + 1}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-300 italic">
                        —
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <RubricLevelBadge
                          level={null}
                          rubricConfig={rubricConfig}
                          size="md"
                        />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-300">
                        Not Assessed
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── RUBRIC LEGEND ── */}
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">
            Rubric Level Legend
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {rubricConfig.length > 0
              ? rubricConfig
                  .slice()
                  .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                  .map((config: any) => (
                    <div
                      key={config.level_code}
                      className="flex items-start gap-2 p-2 rounded-lg border"
                      style={{
                        borderColor: config.color_hex + '40',
                        backgroundColor: config.bg_hex,
                      }}
                    >
                      <span
                        className="text-xs font-black mt-0.5 flex-shrink-0"
                        style={{ color: config.color_hex }}
                      >
                        {config.level_code}
                      </span>
                      <span
                        className="text-[10px] font-medium leading-tight"
                        style={{ color: config.color_hex }}
                      >
                        {config.level_label}
                      </span>
                    </div>
                  ))
              : /* Fallback legend */
                [
                  { code: 'EE', label: 'Exceeds Expectation', color: '#15803d', bg: '#f0fdf4' },
                  { code: 'ME', label: 'Meets Expectation', color: '#1d4ed8', bg: '#eff6ff' },
                  { code: 'AE', label: 'Approaches Expectation', color: '#b45309', bg: '#fffbeb' },
                  { code: 'BE', label: 'Below Expectation', color: '#b91c1c', bg: '#fef2f2' },
                ].map((item) => (
                  <div
                    key={item.code}
                    className="flex items-start gap-2 p-2 rounded-lg border"
                    style={{ borderColor: item.color + '40', backgroundColor: item.bg }}
                  >
                    <span
                      className="text-xs font-black mt-0.5 flex-shrink-0"
                      style={{ color: item.color }}
                    >
                      {item.code}
                    </span>
                    <span
                      className="text-[10px] font-medium leading-tight"
                      style={{ color: item.color }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {/* ── COMMENTS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Teacher comment */}
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Class Teacher&apos;s Comment
            </h3>
            <p className="text-sm text-gray-700 min-h-[60px] leading-relaxed">
              {comments?.teacher_comment || (
                <span className="text-gray-300 italic">No comment provided.</span>
              )}
            </p>
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="h-px bg-gray-300 w-32 mb-1" />
              <p className="text-[10px] text-gray-400">Class Teacher&apos;s Signature</p>
            </div>
          </div>

          {/* Principal comment */}
          <div className="p-4 bg-white rounded-xl border border-gray-200">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
              Principal&apos;s Comment
            </h3>
            <p className="text-sm text-gray-700 min-h-[60px] leading-relaxed">
              {comments?.principal_comment || (
                <span className="text-gray-300 italic">No comment provided.</span>
              )}
            </p>
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="h-px bg-gray-300 w-32 mb-1" />
              <p className="text-[10px] text-gray-400">Principal&apos;s Signature &amp; Stamp</p>
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-[10px] text-gray-400">
            Generated by APSIMS · CBC Senior School Report Card
          </p>
          <p className="text-[10px] text-gray-400">
            {termName} · {academicYear}
          </p>
        </div>
      </div>
    </>
  );
}

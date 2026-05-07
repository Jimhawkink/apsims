/**
 * CBC Ultra-Compliance Utility Library
 *
 * Pure utility functions for the dual-system (8-4-4 / CBC Senior School) detection,
 * subject combination management, and competency summary computation.
 *
 * All functions are stateless and side-effect-free — safe to use in both
 * server components and client components.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** All valid rubric level codes in descending order (EE is highest). */
export const RUBRIC_LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

/** Numeric weight for each rubric level (used in weighted summary computation). */
export const RUBRIC_NUMERIC: Record<RubricLevel, number> = {
  EE: 4,
  ME: 3,
  AE: 2,
  BE: 1,
};

/** Reverse map: numeric weight → rubric level. */
export const NUMERIC_RUBRIC: Record<number, RubricLevel> = {
  4: 'EE',
  3: 'ME',
  2: 'AE',
  1: 'BE',
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RubricLevel = 'EE' | 'ME' | 'AE' | 'BE';
export type EducationSystem = 'CBC_Senior_School' | '8-4-4';
export type ReportCardTemplate = 'cbc' | '844';

// ---------------------------------------------------------------------------
// 1. getEducationSystem
// ---------------------------------------------------------------------------

/**
 * Returns the education system for a given form ID by looking it up in the
 * provided forms array.
 *
 * @param formId - The ID of the form to look up.
 * @param forms  - Array of form records (must have `id` and `education_system` fields).
 * @returns `'CBC_Senior_School'` or `'8-4-4'` based on the form's `education_system`
 *          column. Returns `'8-4-4'` as a safe default when the column is not set.
 *          Returns `null` when no form with the given ID is found.
 */
export function getEducationSystem(
  formId: number,
  forms: any[]
): EducationSystem | null {
  const form = forms.find((f) => f.id === formId);
  if (!form) return null;
  // Return the stored value if it is one of the two valid systems;
  // fall back to '8-4-4' as a safe default when the column is absent/null.
  if (form.education_system === 'CBC_Senior_School') return 'CBC_Senior_School';
  return '8-4-4';
}

// ---------------------------------------------------------------------------
// 2. formatFormLabel
// ---------------------------------------------------------------------------

/**
 * Formats a form record into a human-readable label that includes the
 * education-system badge.
 *
 * @param form - A form record with at least `form_name` and `education_system`.
 * @returns A string such as `"Grade 10 [CBC]"` or `"Form 3 [8-4-4]"`.
 *
 * @example
 * formatFormLabel({ form_name: 'Grade 10', education_system: 'CBC_Senior_School' })
 * // → "Grade 10 [CBC]"
 *
 * formatFormLabel({ form_name: 'Form 3', education_system: '8-4-4' })
 * // → "Form 3 [8-4-4]"
 */
export function formatFormLabel(form: any): string {
  const badge =
    form.education_system === 'CBC_Senior_School' ? '[CBC]' : '[8-4-4]';
  return `${form.form_name} ${badge}`;
}

// ---------------------------------------------------------------------------
// 3. getReportCardTemplate
// ---------------------------------------------------------------------------

/**
 * Determines which report card template to use for a given student.
 *
 * Delegates to {@link getEducationSystem} using the student's `form_id`.
 *
 * @param student - A student record with at least a `form_id` field.
 * @param forms   - Array of form records.
 * @returns `'cbc'` for CBC Senior School students, `'844'` for 8-4-4 students.
 *          Defaults to `'844'` when the form is not found.
 */
export function getReportCardTemplate(
  student: any,
  forms: any[]
): ReportCardTemplate {
  const system = getEducationSystem(student.form_id, forms);
  return system === 'CBC_Senior_School' ? 'cbc' : '844';
}

// ---------------------------------------------------------------------------
// 4. partitionBySystem
// ---------------------------------------------------------------------------

/**
 * Splits a list of students into two disjoint groups based on their form's
 * education system.
 *
 * Every student appears in exactly one group — no student is omitted or
 * duplicated.
 *
 * @param students - Array of student records (each must have a `form_id`).
 * @param forms    - Array of form records.
 * @returns An object with two arrays:
 *   - `cbc`: students whose form has `education_system = 'CBC_Senior_School'`
 *   - `eightFourFour`: all other students (including those with unknown forms)
 */
export function partitionBySystem(
  students: any[],
  forms: any[]
): { cbc: any[]; eightFourFour: any[] } {
  const cbc: any[] = [];
  const eightFourFour: any[] = [];

  for (const student of students) {
    const system = getEducationSystem(student.form_id, forms);
    if (system === 'CBC_Senior_School') {
      cbc.push(student);
    } else {
      eightFourFour.push(student);
    }
  }

  return { cbc, eightFourFour };
}

// ---------------------------------------------------------------------------
// 5. buildSubjectCombination
// ---------------------------------------------------------------------------

/**
 * Builds the full 7-subject combination for a student in a given pathway.
 *
 * The combination always contains all 4 compulsory subjects (English,
 * Kiswahili, PE, CLP) plus the elective subjects that belong to the
 * specified pathway.
 *
 * @param pathwayId          - The ID of the selected pathway.
 * @param compulsorySubjects - Array of subject objects that are compulsory
 *                             (i.e. `is_compulsory = true` in `cbc_pathway_subjects`).
 * @param electiveSubjects   - Array of subject objects for the given pathway
 *                             (i.e. `is_compulsory = false` for this pathway).
 * @returns A flat array of all compulsory subjects followed by the elective
 *          subjects for the pathway. The `pathwayId` parameter is accepted for
 *          API symmetry and future filtering; the caller is expected to pass
 *          pre-filtered electives.
 */
export function buildSubjectCombination(
  pathwayId: number,
  compulsorySubjects: any[],
  electiveSubjects: any[]
): any[] {
  // Combine all compulsory subjects with the pathway's elective subjects.
  // The caller provides electives already filtered to the given pathway.
  return [...compulsorySubjects, ...electiveSubjects];
}

// ---------------------------------------------------------------------------
// 6. validateSubjectCombination
// ---------------------------------------------------------------------------

/**
 * Validates that a student has selected exactly 3 elective subjects.
 *
 * @param electives - Array of selected elective subjects (or any array whose
 *                    length represents the number of electives chosen).
 * @returns `true` if and only if exactly 3 electives are selected.
 *
 * @example
 * validateSubjectCombination([s1, s2, s3]) // → true
 * validateSubjectCombination([s1, s2])     // → false
 * validateSubjectCombination([])           // → false
 */
export function validateSubjectCombination(electives: any[]): boolean {
  return electives.length === 3;
}

// ---------------------------------------------------------------------------
// 7. countElectivesForPathway
// ---------------------------------------------------------------------------

/**
 * Counts the number of elective subjects available for a given pathway.
 *
 * @param pathwayId      - The ID of the pathway to count electives for.
 * @param pathwaySubjects - Array of `cbc_pathway_subjects` records (each must
 *                          have `pathway_id` and `is_compulsory` fields).
 * @returns The number of records where `pathway_id === pathwayId` and
 *          `is_compulsory` is falsy.
 */
export function countElectivesForPathway(
  pathwayId: number,
  pathwaySubjects: any[]
): number {
  return pathwaySubjects.filter(
    (ps) => ps.pathway_id === pathwayId && !ps.is_compulsory
  ).length;
}

// ---------------------------------------------------------------------------
// 8. getStudentsForSubject
// ---------------------------------------------------------------------------

/**
 * Returns the IDs of all students enrolled in a given subject.
 *
 * @param subjectId      - The ID of the subject to look up.
 * @param studentSubjects - Array of `cbc_student_subjects` records (each must
 *                          have `subject_id` and `student_id` fields).
 * @returns An array of `student_id` values for students enrolled in the subject.
 */
export function getStudentsForSubject(
  subjectId: number,
  studentSubjects: any[]
): number[] {
  return studentSubjects
    .filter((ss) => ss.subject_id === subjectId)
    .map((ss) => ss.student_id as number);
}

// ---------------------------------------------------------------------------
// 9. computeCompetencySummary
// ---------------------------------------------------------------------------

/**
 * Computes the overall competency level from an array of rubric levels using
 * the **mode with tiebreak** rule.
 *
 * Tiebreak order (highest wins): EE > ME > AE > BE.
 *
 * @param levels - Array of rubric levels (may be empty).
 * @returns The most frequently occurring level, with ties broken in favour of
 *          the higher level. Returns `null` for an empty array.
 *
 * @example
 * computeCompetencySummary(['EE', 'ME', 'EE']) // → 'EE'  (EE appears twice)
 * computeCompetencySummary(['ME', 'AE'])        // → 'ME'  (tie → ME wins)
 * computeCompetencySummary([])                  // → null
 */
export function computeCompetencySummary(
  levels: RubricLevel[]
): RubricLevel | null {
  if (levels.length === 0) return null;

  // Count occurrences of each level.
  const counts: Record<RubricLevel, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
  for (const level of levels) {
    counts[level]++;
  }

  // Find the maximum count.
  const maxCount = Math.max(...(Object.values(counts) as number[]));

  // Among all levels that share the maximum count, pick the highest-ranked one.
  // RUBRIC_LEVELS is ordered EE → ME → AE → BE (highest to lowest).
  for (const level of RUBRIC_LEVELS) {
    if (counts[level] === maxCount) {
      return level;
    }
  }

  // Unreachable — levels array is non-empty so at least one count > 0.
  return null;
}

// ---------------------------------------------------------------------------
// 10. computeWeightedSummary
// ---------------------------------------------------------------------------

/**
 * Computes the overall competency level using a 60% formative / 40% summative
 * weighted average.
 *
 * Numeric mapping: EE = 4, ME = 3, AE = 2, BE = 1.
 * The weighted average is rounded to the nearest integer and mapped back to a
 * rubric level. Values below 1 clamp to BE; values above 4 clamp to EE.
 *
 * @param formativeLevel - The overall formative competency level.
 * @param summativeLevel - The summative competency level.
 * @returns The weighted overall rubric level.
 *
 * @example
 * computeWeightedSummary('EE', 'ME')
 * // 0.6 * 4 + 0.4 * 3 = 2.4 + 1.2 = 3.6 → rounds to 4 → 'EE'
 *
 * computeWeightedSummary('AE', 'BE')
 * // 0.6 * 2 + 0.4 * 1 = 1.2 + 0.4 = 1.6 → rounds to 2 → 'AE'
 */
export function computeWeightedSummary(
  formativeLevel: RubricLevel,
  summativeLevel: RubricLevel
): RubricLevel {
  const formativeNum = RUBRIC_NUMERIC[formativeLevel];
  const summativeNum = RUBRIC_NUMERIC[summativeLevel];

  const weighted = 0.6 * formativeNum + 0.4 * summativeNum;
  const rounded = Math.round(weighted);

  // Clamp to valid range [1, 4] and map back to a rubric level.
  const clamped = Math.min(4, Math.max(1, rounded)) as 1 | 2 | 3 | 4;
  return NUMERIC_RUBRIC[clamped];
}

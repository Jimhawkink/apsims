/**
 * CBC Competency Summary Computation
 *
 * Async helpers that fetch assessment data from Supabase and upsert
 * computed competency summaries into `cbc_competency_summaries`.
 *
 * These functions are safe to call from both server and client contexts
 * as long as the Supabase client is available.
 */

import { supabase } from './supabase';
import { computeCompetencySummary, computeWeightedSummary, RubricLevel } from './cbc-utils';

// ---------------------------------------------------------------------------
// recomputeSummary
// ---------------------------------------------------------------------------

/**
 * Recomputes and upserts the competency summary for a single student/subject/term.
 *
 * Algorithm:
 * 1. Fetch all `cbc_assessments` for the given student/subject/term.
 * 2. Compute `formative_level` = mode of all Formative entries' rubric_levels.
 * 3. Get `summative_level` from the single Summative entry (if any).
 * 4. Compute `overall_level`:
 *    - Both exist → `computeWeightedSummary(formative, summative)` (60/40)
 *    - Only formative → use formative_level
 *    - Only summative → use summative_level
 *    - Neither → null
 * 5. Upsert into `cbc_competency_summaries` with `last_computed_at = now()`.
 *
 * @param studentId - The student's ID.
 * @param subjectId - The subject's ID.
 * @param termId    - The term's ID.
 */
export async function recomputeSummary(
  studentId: number,
  subjectId: number,
  termId: number
): Promise<void> {
  // 1. Fetch all assessments for this student/subject/term
  const { data: allAssessments, error } = await supabase
    .from('cbc_assessments')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_id', subjectId)
    .eq('term_id', termId);

  if (error) {
    console.error('[recomputeSummary] Failed to fetch assessments:', error);
    return;
  }

  const assessments = allAssessments || [];

  // 2. Compute formative level from all Formative entries
  const formativeEntries = assessments.filter(a => a.assessment_type === 'Formative');
  const formativeLevels = formativeEntries
    .map(a => a.rubric_level as RubricLevel)
    .filter((l): l is RubricLevel => Boolean(l));

  const formativeLevel: RubricLevel | null =
    formativeLevels.length > 0 ? computeCompetencySummary(formativeLevels) : null;

  // 3. Get summative level from the single Summative entry
  const summativeEntry = assessments.find(a => a.assessment_type === 'Summative');
  const summativeLevel: RubricLevel | null =
    (summativeEntry?.rubric_level as RubricLevel) || null;

  // 4. Compute overall level
  let overallLevel: RubricLevel | null = null;
  if (formativeLevel && summativeLevel) {
    overallLevel = computeWeightedSummary(formativeLevel, summativeLevel);
  } else if (formativeLevel) {
    overallLevel = formativeLevel;
  } else if (summativeLevel) {
    overallLevel = summativeLevel;
  }

  // 5. Upsert into cbc_competency_summaries
  const { error: upsertError } = await supabase
    .from('cbc_competency_summaries')
    .upsert(
      {
        student_id: studentId,
        subject_id: subjectId,
        term_id: termId,
        formative_level: formativeLevel,
        summative_level: summativeLevel,
        overall_level: overallLevel,
        formative_count: formativeLevels.length,
        last_computed_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,subject_id,term_id' }
    );

  if (upsertError) {
    console.error('[recomputeSummary] Failed to upsert summary:', upsertError);
  }
}

// ---------------------------------------------------------------------------
// recomputeAllSummariesForClass
// ---------------------------------------------------------------------------

/**
 * Recomputes competency summaries for every student/subject pair in a class.
 *
 * Algorithm:
 * 1. Fetch all active students in the given form.
 * 2. Fetch all `cbc_student_subjects` for those students.
 * 3. For each unique (student_id, subject_id) pair, call `recomputeSummary`.
 *
 * @param formId - The form (class) ID.
 * @param termId - The term ID.
 */
export async function recomputeAllSummariesForClass(
  formId: number,
  termId: number
): Promise<void> {
  // 1. Get all students in the form
  const { data: students, error: studentsError } = await supabase
    .from('school_students')
    .select('id')
    .eq('form_id', formId)
    .eq('status', 'Active');

  if (studentsError || !students) {
    console.error('[recomputeAllSummariesForClass] Failed to fetch students:', studentsError);
    return;
  }

  if (students.length === 0) return;

  const studentIds = students.map(s => s.id);

  // 2. Get all cbc_student_subjects for those students
  const { data: studentSubjects, error: ssError } = await supabase
    .from('cbc_student_subjects')
    .select('student_id, subject_id')
    .in('student_id', studentIds);

  if (ssError || !studentSubjects) {
    console.error('[recomputeAllSummariesForClass] Failed to fetch student subjects:', ssError);
    return;
  }

  // 3. For each unique student/subject pair, call recomputeSummary
  const pairs = studentSubjects.map(ss => ({
    studentId: ss.student_id as number,
    subjectId: ss.subject_id as number,
  }));

  // Process in parallel (batches of 10 to avoid overwhelming the DB)
  const batchSize = 10;
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize);
    await Promise.all(
      batch.map(({ studentId, subjectId }) =>
        recomputeSummary(studentId, subjectId, termId)
      )
    );
  }
}

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem, getStudentsForSubject, computeCompetencySummary, computeWeightedSummary, RubricLevel } from '@/lib/cbc-utils';
import toast from 'react-hot-toast';

// Score-to-rubric mapping
function scoreToLevel(score: string): RubricLevel | null {
  if (score === '' || score === null || score === undefined) return null;
  const n = parseInt(score, 10);
  if (isNaN(n)) return null;
  if (n >= 80) return 'EE';
  if (n >= 60) return 'ME';
  if (n >= 40) return 'AE';
  return 'BE';
}

export function useUltraCBCMarks() {
  // ── Reference data ──
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [rubricConfig, setRubricConfig] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [prevTermAssessments, setPrevTermAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Filter selections ──
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selAssessmentType, setSelAssessmentType] = useState('Summative');
  const [taskName, setTaskName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [rubricFilter, setRubricFilter] = useState('');

  // ── Mark entry state ──
  const [markLevels, setMarkLevels] = useState<Record<number, RubricLevel | null>>({});
  const [markScores, setMarkScores] = useState<Record<number, string>>({});
  const [markNotes, setMarkNotes] = useState<Record<number, string>>({});

  // ── Bulk mode ──
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // ── Confirm dialog ──
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSaveRef = useRef<(force: boolean) => Promise<void>>(() => Promise.resolve());

  // ── Initial data fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, termsRes, ssRes, rubricRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('cbc_student_subjects').select('*'),
      supabase.from('cbc_rubric_config').select('*').order('sort_order'),
    ]);

    const allForms = formsRes.data || [];
    const cbcForms = allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School');

    setForms(cbcForms);
    setStreams(streamsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTerms(termsRes.data || []);
    setStudentSubjects(ssRes.data || []);
    setRubricConfig(rubricRes.data || []);

    const cur = (termsRes.data || []).find((t: any) => t.is_current);
    if (cur) setSelTerm(String(cur.id));

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Fetch students when form/stream changes ──
  useEffect(() => {
    if (!selForm) { setStudents([]); return; }
    const load = async () => {
      const query = supabase.from('school_students').select('*').eq('form_id', Number(selForm)).eq('status', 'Active').order('first_name');
      if (selStream) query.eq('stream_id', Number(selStream));
      const { data } = await query;
      setStudents(data || []);
    };
    load();
  }, [selForm, selStream]);

  // ── Fetch assessments when filters change ──
  useEffect(() => {
    if (!selForm || !selTerm || !selSubject) {
      setAssessments([]);
      setMarkLevels({});
      setMarkScores({});
      setMarkNotes({});
      return;
    }

    const currentStudentIds = students.map(s => s.id);
    if (currentStudentIds.length === 0) {
      // Students haven't loaded yet — don't wipe existing state.
      // Effect will re-run when `students` changes.
      return;
    }

    // Use a cancelled flag so that if this effect re-runs before the async
    // fetch completes, the stale response is discarded and does NOT overwrite
    // the markLevels that the newer run will set. This is the core fix for
    // "2 assessed before refresh → 0 after refresh".
    let cancelled = false;

    const load = async () => {
      const [asmtRes, scoreRes, noteRes] = await Promise.all([
        supabase.from('cbc_assessments').select('*')
          .in('student_id', currentStudentIds)
          .eq('subject_id', Number(selSubject))
          .eq('term_id', Number(selTerm)),
        supabase.from('cbc_mark_scores').select('*')
          .in('student_id', currentStudentIds)
          .eq('subject_id', Number(selSubject))
          .eq('term_id', Number(selTerm))
          .eq('assessment_type', selAssessmentType),
        supabase.from('cbc_teacher_notes').select('*')
          .in('student_id', currentStudentIds)
          .eq('subject_id', Number(selSubject))
          .eq('term_id', Number(selTerm)),
      ]);

      // If the effect was re-triggered while we were awaiting, discard this result.
      if (cancelled) return;

      const asmtData = asmtRes.data || [];
      setAssessments(asmtData);

      // Build levels — type + task filter applied in-memory.
      const newLevels: Record<number, RubricLevel | null> = {};
      asmtData.forEach((a: any) => {
        const matchesType = a.assessment_type === selAssessmentType;
        const matchesTask = selAssessmentType === 'Summative' || a.task_name === taskName;
        if (matchesType && matchesTask && a.rubric_level) {
          newLevels[a.student_id] = a.rubric_level as RubricLevel;
        }
      });
      setMarkLevels(newLevels);

      // Build scores from cbc_mark_scores
      const newScores: Record<number, string> = {};
      (scoreRes.data || []).forEach((ms: any) => {
        newScores[ms.student_id] = ms.raw_score != null ? String(ms.raw_score) : '';
      });
      // Fallback: raw_score from assessments table
      asmtData.forEach((a: any) => {
        const matchesType = a.assessment_type === selAssessmentType;
        const matchesTask = selAssessmentType === 'Summative' || a.task_name === taskName;
        if (matchesType && matchesTask && a.raw_score != null && !newScores[a.student_id]) {
          newScores[a.student_id] = String(a.raw_score);
        }
      });
      setMarkScores(newScores);

      // Build notes
      const newNotes: Record<number, string> = {};
      (noteRes.data || []).forEach((tn: any) => {
        newNotes[tn.student_id] = tn.note_text || '';
      });
      setMarkNotes(newNotes);
    };

    load();

    // Cleanup: mark this run as cancelled so its async result is ignored
    // if the effect fires again before the fetch completes.
    return () => { cancelled = true; };
  }, [selForm, selTerm, selSubject, students, selAssessmentType, taskName]);

  // ── Fetch previous term assessments for trend arrows ──
  useEffect(() => {
    if (!selTerm || !selSubject) { setPrevTermAssessments([]); return; }
    const currentTermIdx = terms.findIndex(t => String(t.id) === selTerm);
    if (currentTermIdx < 0 || currentTermIdx >= terms.length - 1) { setPrevTermAssessments([]); return; }
    const prevTerm = terms[currentTermIdx + 1];
    if (!prevTerm) { setPrevTermAssessments([]); return; }

    const load = async () => {
      const { data } = await supabase.from('cbc_assessments').select('*')
        .eq('subject_id', Number(selSubject)).eq('term_id', prevTerm.id);
      setPrevTermAssessments(data || []);
    };
    load();
  }, [selTerm, selSubject, terms]);

  // ── Enrolled students ──
  // If cbc_student_subjects has entries for this subject, filter to enrolled only.
  // If the table is empty (no enrollment data), fall back to ALL students in the
  // form — this prevents the page from showing 0 students when enrollment hasn't
  // been set up yet.
  const enrolledStudentIds = selSubject ? getStudentsForSubject(Number(selSubject), studentSubjects) : [];
  const enrolledStudents = enrolledStudentIds.length > 0
    ? students.filter(s => enrolledStudentIds.includes(s.id))
    : students; // fallback: show all form students when no enrollment data exists

  // ── Available subjects ──
  const availableSubjectIds = new Set(
    studentSubjects.filter(ss => students.some(s => s.id === ss.student_id)).map(ss => ss.subject_id)
  );
  const availableSubjects = subjects.filter(s => availableSubjectIds.has(s.id));

  // ── Previous term level per student ──
  const prevTermLevels = useMemo(() => {
    const map: Record<number, RubricLevel | null> = {};
    enrolledStudents.forEach(s => {
      const prev = prevTermAssessments.find(a => a.student_id === s.id && a.assessment_type === 'Summative');
      map[s.id] = prev?.rubric_level || null;
    });
    return map;
  }, [enrolledStudents, prevTermAssessments]);

  // ── Formative average per student ──
  const formativeAvgLevels = useMemo(() => {
    const map: Record<number, RubricLevel | null> = {};
    enrolledStudents.forEach(s => {
      const formatives = assessments.filter(a => a.student_id === s.id && a.assessment_type === 'Formative');
      if (formatives.length > 0) {
        const levels = formatives.map(a => a.rubric_level as RubricLevel).filter(Boolean);
        map[s.id] = computeCompetencySummary(levels);
      } else {
        map[s.id] = null;
      }
    });
    return map;
  }, [enrolledStudents, assessments]);

  // ── Filtered students ──
  const filteredStudents = useMemo(() => {
    return enrolledStudents.filter(s => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const adm = (s.admission_no || s.admission_number || '').toLowerCase();
      if (searchQuery && !fullName.includes(searchQuery.toLowerCase()) && !adm.includes(searchQuery.toLowerCase())) return false;
      if (rubricFilter) {
        const level = markLevels[s.id];
        if (rubricFilter === 'NA' && level) return false;
        if (rubricFilter !== 'NA' && level !== rubricFilter) return false;
      }
      return true;
    });
  }, [enrolledStudents, searchQuery, rubricFilter, markLevels]);

  // ── Analytics counts ──
  const analyticsCounts = useMemo(() => {
    const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0, NA: 0 };
    enrolledStudents.forEach(s => {
      const l = markLevels[s.id];
      if (l && counts[l] !== undefined) counts[l]++;
      else counts.NA++;
    });
    return counts;
  }, [enrolledStudents, markLevels]);

  const totalStudents = enrolledStudents.length;
  const assessedCount = totalStudents - (analyticsCounts.NA || 0);
  const completionPct = totalStudents > 0 ? Math.round((assessedCount / totalStudents) * 100) : 0;

  // ── BE student names for alerts ──
  const beStudentNames = useMemo(() => {
    return enrolledStudents.filter(s => markLevels[s.id] === 'BE').map(s => `${s.first_name} ${s.last_name}`);
  }, [enrolledStudents, markLevels]);

  // ── Auto-note helper: returns the level_label from cbc_rubric_config ──
  // The cbc_rubric_config table has columns: id, level_code, level_label, color_hex, bg_hex, sort_order
  const getAutoNote = useCallback((level: RubricLevel | null): string => {
    if (!level || !rubricConfig || rubricConfig.length === 0) return '';
    const cfg = rubricConfig.find((r: any) => r.level_code === level);
    return cfg?.level_label || '';
  }, [rubricConfig]);

  // ── Handlers ──
  const handleScoreChange = useCallback((studentId: number, value: string) => {
    setMarkScores(prev => ({ ...prev, [studentId]: value }));
    const lvl = scoreToLevel(value);
    if (lvl) {
      setMarkLevels(prev => ({ ...prev, [studentId]: lvl }));
      // Auto-fill teacher note only if the note is currently empty or was a previous auto-note
      setMarkNotes(prev => {
        const existingNote = prev[studentId] || '';
        // Only overwrite if blank — don't override a custom note the teacher typed
        if (!existingNote.trim()) {
          const autoNote = getAutoNote(lvl);
          if (autoNote) return { ...prev, [studentId]: autoNote };
        }
        return prev;
      });
    }
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { triggerSaveRef.current(false); }, 3000);
  }, [getAutoNote]);

  const handleLevelChange = useCallback((studentId: number, level: string) => {
    setMarkLevels(prev => ({ ...prev, [studentId]: level as RubricLevel }));
    // Auto-fill teacher note from rubric config when level is manually selected
    setMarkNotes(prev => {
      const existingNote = prev[studentId] || '';
      // Only overwrite if blank — preserve custom teacher notes
      if (!existingNote.trim()) {
        const autoNote = getAutoNote(level as RubricLevel);
        if (autoNote) return { ...prev, [studentId]: autoNote };
      }
      return prev;
    });
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { triggerSaveRef.current(false); }, 3000);
  }, [getAutoNote]);

  const handleClear = useCallback((studentId: number) => {
    setMarkLevels(prev => ({ ...prev, [studentId]: null }));
    setMarkScores(prev => ({ ...prev, [studentId]: '' }));
    setMarkNotes(prev => ({ ...prev, [studentId]: '' }));
  }, []);

  const handleNoteChange = useCallback((studentId: number, value: string) => {
    setMarkNotes(prev => ({ ...prev, [studentId]: value }));
  }, []);

  const handleCheckChange = useCallback((studentId: number, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(studentId); else next.delete(studentId);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredStudents.map(s => s.id)));
    } else {
      setSelected(new Set());
    }
  }, [filteredStudents]);

  const handleBulkSet = useCallback((level: string) => {
    setMarkLevels(prev => {
      const next = { ...prev };
      selected.forEach(id => { next[id] = level as RubricLevel; });
      return next;
    });
  }, [selected]);

  const handleClearSelected = useCallback(() => {
    selected.forEach(id => {
      setMarkLevels(prev => ({ ...prev, [id]: null }));
      setMarkScores(prev => ({ ...prev, [id]: '' }));
    });
  }, [selected]);

  const toggleBulk = useCallback(() => {
    setBulkMode(prev => !prev);
    setSelected(new Set());
  }, []);

  // ── Save ──
  const triggerSave = async (force: boolean) => {
    if (!selSubject || !selTerm || !selAssessmentType) return;

    const doSave = async () => {
      setSaving(true);
      try {
        const user = JSON.parse(localStorage.getItem('school_user') || '{}');
        const teacherId = user?.id || null;

        for (const student of enrolledStudents) {
          const level = markLevels[student.id];
          if (!level) continue;
          const rawScore = markScores[student.id] ? parseFloat(markScores[student.id]) : null;
          const noteText = markNotes[student.id] || '';

          // Upsert into cbc_assessments
          if (selAssessmentType === 'Summative') {
            await supabase.from('cbc_assessments').upsert({
              student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
              assessment_type: 'Summative', task_name: 'Summative', rubric_level: level,
              raw_score: rawScore, teacher_id: teacherId, assessed_at: new Date().toISOString(),
            }, { onConflict: 'student_id,subject_id,term_id' });
          } else {
            const { data: existing } = await supabase.from('cbc_assessments').select('id')
              .eq('student_id', student.id).eq('subject_id', Number(selSubject)).eq('term_id', Number(selTerm))
              .eq('assessment_type', 'Formative').eq('task_name', taskName || 'Formative Task').maybeSingle();

            if (existing) {
              await supabase.from('cbc_assessments').update({
                rubric_level: level, raw_score: rawScore, assessed_at: new Date().toISOString(),
              }).eq('id', existing.id);
            } else {
              await supabase.from('cbc_assessments').insert({
                student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
                assessment_type: 'Formative', task_name: taskName || 'Formative Task', rubric_level: level,
                raw_score: rawScore, teacher_id: teacherId, assessed_at: new Date().toISOString(),
              });
            }
          }

          // Upsert into cbc_mark_scores
          if (rawScore !== null) {
            await supabase.from('cbc_mark_scores').upsert({
              student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
              assessment_type: selAssessmentType, task_name: selAssessmentType === 'Summative' ? 'Summative' : (taskName || 'Formative Task'),
              raw_score: rawScore, rubric_level: level, teacher_id: teacherId, assessed_at: new Date().toISOString(),
            }, { onConflict: 'student_id,subject_id,term_id,assessment_type,task_name' }).then(() => {});
          }

          // Upsert teacher note
          if (noteText.trim()) {
            await supabase.from('cbc_teacher_notes').upsert({
              student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
              teacher_id: teacherId, note_text: noteText, updated_at: new Date().toISOString(),
            }, { onConflict: 'student_id,subject_id,term_id' }).then(() => {});
          }

          // Flag BE students for intervention
          if (level === 'BE') {
            await supabase.from('cbc_intervention_flags').upsert({
              student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
              flagged_by: teacherId, rubric_level_at_flag: 'BE', raw_score_at_flag: rawScore,
              status: 'open', updated_at: new Date().toISOString(),
            }, { onConflict: 'student_id,subject_id,term_id' }).then(() => {});
          }

          // Recompute competency summary
          await recomputeSummary(student.id, Number(selSubject), Number(selTerm));
        }

        toast.success('Marks saved successfully');
      } catch (err) {
        toast.error('Failed to save marks');
        console.error(err);
      } finally {
        setSaving(false);
      }
    };

    if (selAssessmentType === 'Summative' && !force) {
      const existingSummative = assessments.find(a => a.assessment_type === 'Summative');
      if (existingSummative) {
        setPendingSave(() => doSave);
        setShowConfirm(true);
        return;
      }
    }
    await doSave();
  };

  // Keep ref always pointing to latest triggerSave so auto-save never uses stale closure
  triggerSaveRef.current = triggerSave;

  const recomputeSummary = async (studentId: number, subjectId: number, termId: number) => {
    const { data: allAsmts } = await supabase.from('cbc_assessments').select('*')
      .eq('student_id', studentId).eq('subject_id', subjectId).eq('term_id', termId);
    if (!allAsmts) return;

    const formativeEntries = allAsmts.filter(a => a.assessment_type === 'Formative');
    const summativeEntry = allAsmts.find(a => a.assessment_type === 'Summative');
    const formativeLevels = formativeEntries.map(a => a.rubric_level as RubricLevel).filter(Boolean);

    const formativeLevel = formativeLevels.length > 0 ? computeCompetencySummary(formativeLevels) : null;
    const summativeLevel = summativeEntry?.rubric_level as RubricLevel | null || null;

    let overallLevel: RubricLevel | null = null;
    if (formativeLevel && summativeLevel) overallLevel = computeWeightedSummary(formativeLevel, summativeLevel);
    else if (formativeLevel) overallLevel = formativeLevel;
    else if (summativeLevel) overallLevel = summativeLevel;

    await supabase.from('cbc_competency_summaries').upsert({
      student_id: studentId, subject_id: subjectId, term_id: termId,
      formative_level: formativeLevel, summative_level: summativeLevel,
      overall_level: overallLevel, formative_count: formativeLevels.length,
      last_computed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,subject_id,term_id' });
  };

  const exportCSV = () => {
    const subjectName = subjects.find(s => s.id === Number(selSubject))?.subject_name || '';
    const termName = terms.find(t => t.id === Number(selTerm))?.term_name || '';
    const headers = ['Adm No', 'Student Name', 'Score', 'Rubric Level', 'Assessment Type', 'Term', 'Teacher Note'];
    const rows = enrolledStudents.map(student => [
      student.admission_no || student.admission_number || '',
      `${student.first_name} ${student.last_name}`,
      markScores[student.id] || '',
      markLevels[student.id] || 'Not Assessed',
      selAssessmentType,
      termName,
      markNotes[student.id] || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `cbc-ultra-marks-${subjectName}-${termName}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const isReady = selForm && selSubject && selTerm && selAssessmentType &&
    (selAssessmentType === 'Summative' || taskName.trim().length > 0);

  const subjectName = subjects.find(s => s.id === Number(selSubject))?.subject_name || '';
  const termName = terms.find(t => t.id === Number(selTerm))?.term_name || '';

  return {
    // Data
    forms, streams: streams, availableSubjects, terms, rubricConfig,
    filteredStudents, enrolledStudents, totalStudents, assessedCount, completionPct,
    analyticsCounts, beStudentNames, prevTermLevels, formativeAvgLevels,
    subjectName, termName,
    // State
    loading, saving, isReady, bulkMode, selected,
    markLevels, markScores, markNotes,
    selForm, selStream, selSubject, selTerm, selAssessmentType,
    searchQuery, rubricFilter, taskName,
    showConfirm, pendingSave,
    // Setters
    setSelForm: (v: string) => { setSelForm(v); setSelStream(''); setSelSubject(''); },
    setSelStream: (v: string) => { setSelStream(v); setSelSubject(''); },
    setSelSubject, setSelTerm, setSelAssessmentType, setTaskName,
    setSearchQuery, setRubricFilter,
    setShowConfirm, setPendingSave,
    // Handlers
    handleScoreChange, handleLevelChange, handleClear, handleNoteChange,
    handleCheckChange, handleSelectAll, handleBulkSet, handleClearSelected,
    toggleBulk, triggerSave, exportCSV,
  };
}

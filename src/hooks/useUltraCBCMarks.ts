'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem, getStudentsForSubject, computeCompetencySummary, computeWeightedSummary, RubricLevel } from '@/lib/cbc-utils';
import toast from 'react-hot-toast';

// ─── Mode ────────────────────────────────────────────────────────────────────
export type MarksMode = 'CBC_Senior' | 'JSS';

// ─── JSS Learning Areas (KICD official) ──────────────────────────────────────
export const JSS_LEARNING_AREAS = [
  { id: 'ENG', code: 'ENG', name: 'English',                color: '#2563EB', bg: '#DBEAFE' },
  { id: 'KSW', code: 'KSW', name: 'Kiswahili',              color: '#059669', bg: '#D1FAE5' },
  { id: 'MAT', code: 'MAT', name: 'Mathematics',            color: '#DC2626', bg: '#FEE2E2' },
  { id: 'ISC', code: 'ISC', name: 'Integrated Science',     color: '#7C3AED', bg: '#EDE9FE' },
  { id: 'SST', code: 'SST', name: 'Social Studies',         color: '#D97706', bg: '#FEF3C7' },
  { id: 'AGR', code: 'AGR', name: 'Agriculture',            color: '#16A34A', bg: '#DCFCE7' },
  { id: 'PTS', code: 'PTS', name: 'Pre-Technical',          color: '#0891B2', bg: '#CFFAFE' },
  { id: 'BUS', code: 'BUS', name: 'Business Studies',       color: '#9333EA', bg: '#F3E8FF' },
  { id: 'CAS', code: 'CAS', name: 'Creative Arts & Sports', color: '#EC4899', bg: '#FCE7F3' },
  { id: 'LSE', code: 'LSE', name: 'Life Skills',            color: '#06B6D4', bg: '#E0F2FE' },
  { id: 'CRE', code: 'CRE', name: 'Religious Education',    color: '#6366F1', bg: '#EEF2FF' },
] as const;

export type JSSLACode = typeof JSS_LEARNING_AREAS[number]['code'];

// JSS multi-LA marks: studentId -> laCode -> { score: string, level: RubricLevel|null }
export type JSSMarksMap = Record<string, Record<string, { score: string; level: RubricLevel | null }>>;

// ─── Score → rubric ───────────────────────────────────────────────────────────
export function scoreToLevel(score: string): RubricLevel | null {
  if (score === '' || score === null || score === undefined) return null;
  const n = parseInt(score, 10);
  if (isNaN(n)) return null;
  if (n >= 80) return 'EE';
  if (n >= 60) return 'ME';
  if (n >= 40) return 'AE';
  return 'BE';
}

export function useUltraCBCMarks() {
  // ── Mode ──
  const [mode, setMode] = useState<MarksMode>('CBC_Senior');

  // ── Reference data ──
  const [forms, setForms] = useState<any[]>([]);
  const [allForms, setAllForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [rubricConfig, setRubricConfig] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [prevTermAssessments, setPrevTermAssessments] = useState<any[]>([]);
  const [dbLearningAreas, setDbLearningAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // ── Filter selections ──
  const [selForm, setSelFormRaw] = useState('');
  const [selStream, setSelStreamRaw] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selAssessmentType, setSelAssessmentType] = useState('Summative');
  const [taskName, setTaskName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [rubricFilter, setRubricFilter] = useState('');

  // ── JSS specific ──
  const [selJSSGrade, setSelJSSGrade] = useState(''); // '7', '8', '9'
  const [selJSSLA, setSelJSSLA] = useState('all');    // 'all' | laCode
  const [jssMarks, setJssMarks] = useState<JSSMarksMap>({});
  const [jssSavedMarks, setJssSavedMarks] = useState<JSSMarksMap>({});
  const [jssDirty, setJssDirty] = useState(false);

  // ── CBC Senior mark entry state ──
  const [markLevels, setMarkLevels] = useState<Record<number, RubricLevel | null>>({});
  const [markScores, setMarkScores] = useState<Record<number, string>>({});
  const [markNotes, setMarkNotes] = useState<Record<number, string>>({});

  // ── Live refs so save always reads current data (not stale closures) ──
  const markLevelsRef = useRef<Record<number, RubricLevel | null>>({});
  const markScoresRef = useRef<Record<number, string>>({});
  const markNotesRef  = useRef<Record<number, string>>({});
  const enrolledStudentsRef = useRef<any[]>([]);

  // ── Bulk mode ──
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // ── Confirm dialog ──
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSaveRef = useRef<(force: boolean) => Promise<void>>(() => Promise.resolve());

  // ── Derived: JSS learning areas (prefer DB, fallback to constants) ──
  const jssLearningAreas = useMemo(() => {
    if (dbLearningAreas.length > 0) return dbLearningAreas;
    return JSS_LEARNING_AREAS.map(la => ({ ...la, id: la.code, maxMark: 100 }));
  }, [dbLearningAreas]);

  // ── Initial data fetch ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [formsRes, streamsRes, subjectsRes, termsRes, ssRes, rubricRes, laRes] = await Promise.all([
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*').order('stream_name'),
        supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
        supabase.from('school_terms').select('*').order('id', { ascending: false }),
        supabase.from('cbc_student_subjects').select('*').catch(() => ({ data: [] })),
        supabase.from('cbc_rubric_config').select('*').order('sort_order').catch(() => ({ data: [] })),
        supabase.from('jss_learning_areas').select('id,code,name,color,icon').eq('is_active', true).order('sort_order').catch(() => ({ data: [] })),
      ]);

      const rawForms = formsRes.data || [];
      const cbcForms = rawForms.filter((f: any) => getEducationSystem(f.id, rawForms) === 'CBC_Senior_School');

      setAllForms(rawForms);
      setForms(cbcForms);
      setStreams(streamsRes.data || []);
      setSubjects(subjectsRes.data || []);
      setTerms(termsRes.data || []);
      setStudentSubjects((ssRes as any).data || []);

      // Use DB rubric config if available, else hardcoded fallback
      const rubricData = (rubricRes as any).data;
      if (rubricData && rubricData.length > 0) {
        setRubricConfig(rubricData);
      } else {
        setRubricConfig([
          { level_code: 'EE', level_label: 'Exceeds Expectation',    color_hex: '#15803d', bg_hex: '#f0fdf4', sort_order: 1 },
          { level_code: 'ME', level_label: 'Meets Expectation',      color_hex: '#1d4ed8', bg_hex: '#eff6ff', sort_order: 2 },
          { level_code: 'AE', level_label: 'Approaches Expectation', color_hex: '#b45309', bg_hex: '#fffbeb', sort_order: 3 },
          { level_code: 'BE', level_label: 'Below Expectation',      color_hex: '#b91c1c', bg_hex: '#fef2f2', sort_order: 4 },
        ]);
      }

      const laData = (laRes as any).data;
      if (laData && laData.length > 0) {
        setDbLearningAreas(laData.map((la: any) => ({ ...la, maxMark: 100 })));
      }

      const cur = (termsRes.data || []).find((t: any) => t.is_current);
      if (cur) setSelTerm(String(cur.id));
    } catch (err) {
      console.error('fetchAll error:', err);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived: forms for JSS mode ──
  const jssForms = useMemo(() =>
    allForms.filter(f => f.form_level >= 7 && f.form_level <= 9)
  , [allForms]);

  // ── When mode changes, reset selections ──
  useEffect(() => {
    setSelFormRaw('');
    setSelStreamRaw('');
    setSelSubject('');
    setStudents([]);
    setMarkLevels({});
    setMarkScores({});
    setMarkNotes({});
    setJssMarks({});
    setJssSavedMarks({});
    setJssDirty(false);
    setSelJSSGrade('');
  }, [mode]);

  // ── Fetch students when form/stream changes ──
  useEffect(() => {
    if (!selForm) { setStudents([]); return; }
    const load = async () => {
      let query = supabase.from('school_students').select('*').eq('form_id', Number(selForm)).eq('status', 'Active').order('last_name');
      if (selStream) query = query.eq('stream_id', Number(selStream));
      const { data } = await query;
      setStudents(data || []);
    };
    load();
  }, [selForm, selStream]);

  // ── JSS: when grade changes → find matching form(s) ──
  useEffect(() => {
    if (!selJSSGrade || mode !== 'JSS') return;
    const match = jssForms.find(f => String(f.form_level) === selJSSGrade);
    if (match) {
      setSelFormRaw(String(match.id));
    } else {
      setStudents([]);
    }
  }, [selJSSGrade, jssForms, mode]);

  // ── JSS: load existing marks from jss_marks table ──
  useEffect(() => {
    if (mode !== 'JSS' || !selForm || !selTerm || students.length === 0) {
      setJssMarks({});
      setJssSavedMarks({});
      return;
    }

    const curTerm = terms.find(t => String(t.id) === selTerm);
    const year = curTerm?.year || new Date().getFullYear();

    const load = async () => {
      const ids = students.map(s => s.id);
      const { data, error } = await supabase
        .from('jss_marks')
        .select('student_id,learning_area_id,learning_area_code,competency_level,raw_score,teacher_notes')
        .in('student_id', ids)
        .eq('term_id', Number(selTerm))
        .eq('year', year);

      if (error) { console.error('JSS marks load error:', error); return; }

      const loaded: JSSMarksMap = {};
      (data || []).forEach((m: any) => {
        const sid = String(m.student_id);
        // Use code as key — works even if learning_area_id type changes
        const laKey = m.learning_area_code || String(m.learning_area_id);
        if (!loaded[sid]) loaded[sid] = {};
        loaded[sid][laKey] = {
          score: m.raw_score != null ? String(m.raw_score) : '',
          level: (m.competency_level as RubricLevel) || null,
        };
      });

      setJssMarks(structuredClone(loaded));
      setJssSavedMarks(structuredClone(loaded));
      setJssDirty(false);
    };
    load();
  }, [mode, selForm, selTerm, students, terms]);

  // ── CBC Senior: Fetch assessments when filters change ──
  useEffect(() => {
    if (mode !== 'CBC_Senior') return;
    if (!selForm || !selTerm || !selSubject) {
      setAssessments([]);
      setMarkLevels({});
      setMarkScores({});
      setMarkNotes({});
      return;
    }

    const currentStudentIds = students.map(s => s.id);
    if (currentStudentIds.length === 0) return;

    let cancelled = false;

    const load = async () => {
      // Only query cbc_assessments — the ONLY CBC marks table that exists in DB
      const { data: asmtData, error } = await supabase
        .from('cbc_assessments')
        .select('id, student_id, subject_id, term_id, assessment_type, task_name, rubric_level, notes, assessed_at')
        .in('student_id', currentStudentIds)
        .eq('subject_id', Number(selSubject))
        .eq('term_id', Number(selTerm));

      if (cancelled) return;
      if (error) { console.error('Load error:', error); return; }

      const data = asmtData || [];
      setAssessments(data);

      // Build levels and notes maps filtered to current assessment type / task
      const newLevels: Record<number, RubricLevel | null> = {};
      const newNotes: Record<number, string> = {};

      data.forEach((a: any) => {
        const matchesType = a.assessment_type === selAssessmentType;
        const matchesTask = selAssessmentType === 'Summative' || !taskName || a.task_name === taskName;
        if (matchesType && matchesTask) {
          if (a.rubric_level) newLevels[a.student_id] = a.rubric_level as RubricLevel;
          if (a.notes) newNotes[a.student_id] = a.notes;
        }
      });

      setMarkLevels(newLevels);
      setMarkScores({}); // scores live in rubric_level only in base table — no raw_score column
      setMarkNotes(newNotes);
    };

    load();
    return () => { cancelled = true; };
  }, [mode, selForm, selTerm, selSubject, students, selAssessmentType, taskName]);

  // ── Fetch previous term assessments (CBC Senior) ──
  useEffect(() => {
    if (mode !== 'CBC_Senior' || !selTerm || !selSubject) { setPrevTermAssessments([]); return; }
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
  }, [mode, selTerm, selSubject, terms]);

  // ── CBC Senior: Enrolled students ──
  const enrolledStudentIds = selSubject ? getStudentsForSubject(Number(selSubject), studentSubjects) : [];
  const enrolledStudents = enrolledStudentIds.length > 0
    ? students.filter(s => enrolledStudentIds.includes(s.id))
    : students;

  // ── Keep live refs in sync (always current, never stale in save fn) ──
  markLevelsRef.current = markLevels;
  markScoresRef.current = markScores;
  markNotesRef.current  = markNotes;
  enrolledStudentsRef.current = enrolledStudents;

  // ── CBC Senior: Available subjects ──
  // If cbc_student_subjects is empty (enrollment not configured yet),
  // fall back to showing ALL active subjects so the dropdown is never empty.
  const availableSubjectIds = new Set(
    studentSubjects.filter(ss => students.some(s => s.id === ss.student_id)).map(ss => ss.subject_id)
  );
  const availableSubjects = availableSubjectIds.size > 0
    ? subjects.filter(s => availableSubjectIds.has(s.id))
    : subjects; // fallback: show all subjects when no enrollment data exists

  // ── CBC Senior: Previous term levels ──
  const prevTermLevels = useMemo(() => {
    const map: Record<number, RubricLevel | null> = {};
    enrolledStudents.forEach(s => {
      const prev = prevTermAssessments.find(a => a.student_id === s.id && a.assessment_type === 'Summative');
      map[s.id] = prev?.rubric_level || null;
    });
    return map;
  }, [enrolledStudents, prevTermAssessments]);

  // ── CBC Senior: Formative averages ──
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

  // ── CBC Senior: Filtered students ──
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

  // ── JSS: Filtered students ──
  const jssFilteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.admission_no || s.admission_number || '').toLowerCase().includes(q)
    );
  }, [students, searchQuery]);

  // ── Analytics counts ──
  const analyticsCounts = useMemo(() => {
    const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0, NA: 0 };
    if (mode === 'CBC_Senior') {
      enrolledStudents.forEach(s => {
        const l = markLevels[s.id];
        if (l && counts[l] !== undefined) counts[l]++;
        else counts.NA++;
      });
    } else {
      // JSS: count across all LAs for distribution
      students.forEach(s => {
        const sid = String(s.id);
        const studentLAs = jssMarks[sid] || {};
        const levels = Object.values(studentLAs).map(v => v.level).filter(Boolean);
        if (levels.length === 0) counts.NA++;
        else {
          // Use most common level
          const freq: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
          levels.forEach(l => { if (l) freq[l] = (freq[l] || 0) + 1; });
          const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] as RubricLevel;
          counts[top]++;
        }
      });
    }
    return counts;
  }, [mode, enrolledStudents, markLevels, students, jssMarks]);

  const totalStudents = mode === 'CBC_Senior' ? enrolledStudents.length : students.length;
  const assessedCount = totalStudents - (analyticsCounts.NA || 0);
  const completionPct = totalStudents > 0 ? Math.round((assessedCount / totalStudents) * 100) : 0;

  const beStudentNames = useMemo(() => {
    if (mode === 'CBC_Senior') {
      return enrolledStudents.filter(s => markLevels[s.id] === 'BE').map(s => `${s.first_name} ${s.last_name}`);
    }
    // JSS: flag students with any BE
    return students.filter(s => {
      const sid = String(s.id);
      return Object.values(jssMarks[sid] || {}).some(v => v.level === 'BE');
    }).map(s => `${s.first_name} ${s.last_name}`);
  }, [mode, enrolledStudents, markLevels, students, jssMarks]);

  // ── Auto-note helper ──
  const getAutoNote = useCallback((level: RubricLevel | null): string => {
    if (!level || !rubricConfig || rubricConfig.length === 0) return '';
    const cfg = rubricConfig.find((r: any) => r.level_code === level);
    return cfg?.level_label || '';
  }, [rubricConfig]);

  // ── CBC Senior Handlers ──
  const handleScoreChange = useCallback((studentId: number, value: string) => {
    setMarkScores(prev => ({ ...prev, [studentId]: value }));
    const lvl = scoreToLevel(value);
    if (lvl) {
      setMarkLevels(prev => ({ ...prev, [studentId]: lvl }));
      setMarkNotes(prev => {
        const existingNote = prev[studentId] || '';
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
    setMarkNotes(prev => {
      const existingNote = prev[studentId] || '';
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
    if (checked) setSelected(new Set(filteredStudents.map(s => s.id)));
    else setSelected(new Set());
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

  // ── JSS mark setter ──
  const setJSSMark = useCallback((studentId: number, laCode: string, rawValue: string) => {
    const sid = String(studentId);
    let score = rawValue;
    const num = Number(rawValue);
    let level: RubricLevel | null = null;
    if (rawValue !== '' && !isNaN(num)) {
      const clamped = Math.min(Math.max(num, 0), 100);
      score = String(clamped);
      level = scoreToLevel(String(clamped));
    }
    setJssMarks(prev => ({
      ...prev,
      [sid]: { ...prev[sid], [laCode]: { score, level } },
    }));
    setJssDirty(true);
  }, []);

  // ── JSS Save ──
  const saveJSSMarks = async () => {
    if (!selForm || !selTerm || students.length === 0) return;
    setSaving(true);

    const curTerm = terms.find(t => String(t.id) === selTerm);
    const year = curTerm?.year || new Date().getFullYear();

    try {
      const upsertRows: any[] = [];
      const laMap = Object.fromEntries(jssLearningAreas.map((la: any) => [la.code, la]));

      students.forEach(s => {
        const sid = String(s.id);
        const studentMarks = jssMarks[sid] || {};
        Object.entries(studentMarks).forEach(([laCode, entry]) => {
          if (!entry.level) return;
          const la = laMap[laCode];
          upsertRows.push({
            student_id: s.id,
            learning_area_id: la?.id || null,
            learning_area_code: laCode,
            form_id: Number(selForm),
            term_id: Number(selTerm),
            year,
            competency_level: entry.level,
            raw_score: entry.score !== '' ? Number(entry.score) : null,
          });
        });
      });

      if (upsertRows.length === 0) { toast.error('No marks to save'); setSaving(false); return; }

      const { error } = await supabase.from('jss_marks').upsert(upsertRows, {
        onConflict: 'student_id,learning_area_code,term_id,year',
        ignoreDuplicates: false,
      });

      if (error) {
        // Fallback: try without onConflict (older schema)
        const { error: e2 } = await supabase.from('jss_marks').upsert(upsertRows);
        if (e2) throw e2;
      }

      toast.success(`✅ Saved ${upsertRows.length} marks for ${students.length} students!`);
      setJssSavedMarks(structuredClone(jssMarks));
      setJssDirty(false);
    } catch (e: any) {
      toast.error('Save failed: ' + (e.message || String(e)));
    } finally {
      setSaving(false);
    }
  };

  // ── CBC Senior Save ──
  // force=false  → called by auto-save timer (silent, no confirm dialog)
  // force=true   → called by "Save All" button (shows confirm for existing Summative)
  const triggerSave = async (force: boolean) => {
    if (!selSubject || !selTerm || !selAssessmentType) return; // silent — filters not ready yet

    const currentStudents = enrolledStudentsRef.current;
    const currentLevels   = markLevelsRef.current;
    const currentScores   = markScoresRef.current;
    const currentNotes    = markNotesRef.current;

    if (currentStudents.length === 0) return; // silent — students not loaded yet

    const studentsWithMarks = currentStudents.filter(s => currentLevels[s.id]);
    if (studentsWithMarks.length === 0) {
      // Only show error on explicit manual save, not on auto-save keypress
      if (force) toast.error('No marks entered yet');
      return;
    }

    const doSave = async () => {
      setSaving(true);
      try {
        // Resolve teacher_id from school_teachers (matches by email)
        const user = JSON.parse(localStorage.getItem('school_user') || '{}');
        let teacherId: number | null = null;
        if (user?.email) {
          const { data: t } = await supabase.from('school_teachers').select('id').eq('email', user.email).maybeSingle();
          if (t) teacherId = t.id;
        }

        let savedCount = 0;

        for (const student of currentStudents) {
          const level = currentLevels[student.id];
          if (!level) continue;
          const rawScore = currentScores[student.id] ? parseFloat(currentScores[student.id]) : null;
          const noteText = currentNotes[student.id] || '';

          // ── Primary: cbc_assessments ──────────────────────────────
          if (selAssessmentType === 'Summative') {
            const { data: existing } = await supabase
              .from('cbc_assessments').select('id')
              .eq('student_id', student.id).eq('subject_id', Number(selSubject))
              .eq('term_id', Number(selTerm)).eq('assessment_type', 'Summative')
              .maybeSingle();
            if (existing) {
              const { error: ue } = await supabase.from('cbc_assessments').update({
                rubric_level: level, raw_score: rawScore, notes: noteText || null,
                assessed_at: new Date().toISOString(),
              }).eq('id', existing.id);
              if (ue) console.error('assessment update err:', ue);
            } else {
              const { error: ie } = await supabase.from('cbc_assessments').insert({
                student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
                assessment_type: 'Summative', task_name: 'Summative', rubric_level: level,
                raw_score: rawScore, notes: noteText || null, teacher_id: teacherId,
                assessed_at: new Date().toISOString(),
              });
              if (ie) { console.error('assessment insert err:', ie); continue; }
            }
          } else {
            const tName = taskName || 'Formative Task';
            const { data: existing } = await supabase
              .from('cbc_assessments').select('id')
              .eq('student_id', student.id).eq('subject_id', Number(selSubject))
              .eq('term_id', Number(selTerm)).eq('assessment_type', 'Formative')
              .eq('task_name', tName).maybeSingle();
            if (existing) {
              const { error: ue } = await supabase.from('cbc_assessments').update({
                rubric_level: level, raw_score: rawScore, notes: noteText || null,
                assessed_at: new Date().toISOString(),
              }).eq('id', existing.id);
              if (ue) console.error('assessment update err:', ue);
            } else {
              const { error: ie } = await supabase.from('cbc_assessments').insert({
                student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
                assessment_type: 'Formative', task_name: tName, rubric_level: level,
                raw_score: rawScore, notes: noteText || null, teacher_id: teacherId,
                assessed_at: new Date().toISOString(),
              });
              if (ie) { console.error('assessment insert err:', ie); continue; }
            }
          }

          // ── cbc_mark_scores (numeric score store) ─────────────────
          if (rawScore !== null) {
            try {
              await supabase.from('cbc_mark_scores').upsert({
                student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
                assessment_type: selAssessmentType,
                task_name: selAssessmentType === 'Summative' ? 'Summative' : (taskName || 'Formative Task'),
                raw_score: rawScore, rubric_level: level, teacher_id: teacherId,
                assessed_at: new Date().toISOString(), updated_at: new Date().toISOString(),
              }, { onConflict: 'student_id,subject_id,term_id,assessment_type,task_name' });
            } catch (_) { /* table may not exist yet — run migration */ }
          }

          // ── cbc_teacher_notes ─────────────────────────────────────
          if (noteText.trim()) {
            try {
              await supabase.from('cbc_teacher_notes').upsert({
                student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
                teacher_id: teacherId, note_text: noteText, updated_at: new Date().toISOString(),
              }, { onConflict: 'student_id,subject_id,term_id' });
            } catch (_) { /* table may not exist yet */ }
          }

          // ── cbc_intervention_flags (BE students) ──────────────────
          if (level === 'BE') {
            try {
              await supabase.from('cbc_intervention_flags').upsert({
                student_id: student.id, subject_id: Number(selSubject), term_id: Number(selTerm),
                flagged_by: teacherId, rubric_level_at_flag: 'BE', raw_score_at_flag: rawScore,
                status: 'open', updated_at: new Date().toISOString(),
              }, { onConflict: 'student_id,subject_id,term_id' });
            } catch (_) { /* table may not exist yet */ }
          }

          // ── cbc_competency_summaries ──────────────────────────────
          try { await recomputeSummary(student.id, Number(selSubject), Number(selTerm)); }
          catch (_) { /* table may not exist yet */ }

          savedCount++;
        }

        if (force) {
          toast.success(`✅ Saved ${savedCount} students!`);
        } else {
          toast.success('💾 Auto-saved', { duration: 1500 });
        }
      } catch (err: any) {
        toast.error('Save failed: ' + (err?.message || String(err)));
        console.error('CBC save error:', err);
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

  triggerSaveRef.current = triggerSave;

  const recomputeSummary = async (studentId: number, subjectId: number, termId: number) => {
    const { data: allAsmts } = await supabase.from('cbc_assessments').select('*')
      .eq('student_id', studentId).eq('subject_id', subjectId).eq('term_id', termId);
    if (!allAsmts) return;

    const formativeEntries = allAsmts.filter((a: any) => a.assessment_type === 'Formative');
    const summativeEntry = allAsmts.find((a: any) => a.assessment_type === 'Summative');
    const formativeLevels = formativeEntries.map((a: any) => a.rubric_level as RubricLevel).filter(Boolean);

    const formativeLevel = formativeLevels.length > 0 ? computeCompetencySummary(formativeLevels) : null;
    const summativeLevel = (summativeEntry?.rubric_level as RubricLevel) || null;

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


  // ── Export CSV ──
  const exportCSV = () => {
    if (mode === 'JSS') {
      const termName = terms.find(t => String(t.id) === selTerm)?.term_name || '';
      const headers = ['Adm No', 'Student Name', ...jssLearningAreas.flatMap((la: any) => [`${la.code} Score`, `${la.code} Level`]), 'Average %'];
      const rows = students.map(s => {
        const sid = String(s.id);
        const marks = jssMarks[sid] || {};
        const scores = jssLearningAreas.map((la: any) => Number(marks[la.code]?.score || 0)).filter(v => v > 0);
        const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : '';
        return [
          s.admission_no || s.admission_number || '',
          `${s.first_name} ${s.last_name}`,
          ...jssLearningAreas.flatMap((la: any) => [marks[la.code]?.score || '', marks[la.code]?.level || '']),
          avg,
        ];
      });
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `JSS_Marks_Grade${selJSSGrade}_${termName}.csv`; a.click();
    } else {
      const subjectName = subjects.find(s => s.id === Number(selSubject))?.subject_name || '';
      const termName = terms.find(t => t.id === Number(selTerm))?.term_name || '';
      const headers = ['Adm No', 'Student Name', 'Score', 'Rubric Level', 'Assessment Type', 'Term', 'Teacher Note'];
      const rows = enrolledStudents.map(student => [
        student.admission_no || student.admission_number || '',
        `${student.first_name} ${student.last_name}`,
        markScores[student.id] || '',
        markLevels[student.id] || 'Not Assessed',
        selAssessmentType, termName,
        markNotes[student.id] || '',
      ]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `cbc-ultra-marks-${subjectName}-${termName}.csv`; a.click();
    }
    URL.revokeObjectURL(''); // cleanup hint
    toast.success('Exported!');
  };

  const isReady = mode === 'JSS'
    ? !!(selJSSGrade && selTerm && students.length > 0)
    : !!(selForm && selSubject && selTerm && selAssessmentType &&
        (selAssessmentType === 'Summative' || taskName.trim().length > 0));

  const subjectName = subjects.find(s => s.id === Number(selSubject))?.subject_name || '';
  const termName = terms.find(t => t.id === Number(selTerm))?.term_name || '';

  const setSelForm = (v: string) => { setSelFormRaw(v); setSelStreamRaw(''); setSelSubject(''); };
  const setSelStream = (v: string) => { setSelStreamRaw(v); setSelSubject(''); };

  return {
    // Mode
    mode, setMode,
    // Data
    forms, jssForms, allForms, streams, availableSubjects, terms, rubricConfig,
    jssLearningAreas,
    filteredStudents, enrolledStudents, totalStudents, assessedCount, completionPct,
    analyticsCounts, beStudentNames, prevTermLevels, formativeAvgLevels,
    subjectName, termName,
    // CBC Senior state
    loading, saving, isReady, bulkMode, selected,
    markLevels, markScores, markNotes,
    assessments,
    // JSS state
    jssMarks, jssSavedMarks, jssDirty, jssFilteredStudents,
    selJSSGrade, setSelJSSGrade,
    selJSSLA, setSelJSSLA,
    students,
    // Selections
    selForm, selStream, selSubject, selTerm, selAssessmentType,
    searchQuery, rubricFilter, taskName,
    showConfirm, pendingSave,
    // Setters
    setSelForm, setSelStream,
    setSelSubject, setSelTerm, setSelAssessmentType, setTaskName,
    setSearchQuery, setRubricFilter,
    setShowConfirm, setPendingSave,
    // Handlers (CBC Senior)
    handleScoreChange, handleLevelChange, handleClear, handleNoteChange,
    handleCheckChange, handleSelectAll, handleBulkSet, handleClearSelected,
    toggleBulk, triggerSave, exportCSV,
    // Handlers (JSS)
    setJSSMark, saveJSSMarks,
  };
}

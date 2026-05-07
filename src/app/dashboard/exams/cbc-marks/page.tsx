'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getEducationSystem,
  getStudentsForSubject,
  computeCompetencySummary,
  computeWeightedSummary,
  RubricLevel,
} from '@/lib/cbc-utils';
import RubricLevelBadge from '@/components/cbc/RubricLevelBadge';
import EducationSystemBadge from '@/components/cbc/EducationSystemBadge';
import toast from 'react-hot-toast';
import { FiDownload, FiFileText, FiCheckCircle } from 'react-icons/fi';

export default function CBCMarksPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [pathways, setPathways] = useState<any[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [rubricConfig, setRubricConfig] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Selections
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selSubject, setSelSubject] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selAssessmentType, setSelAssessmentType] = useState<'Formative' | 'Summative'>('Formative');
  const [taskName, setTaskName] = useState('');

  // Marks state: { [studentId]: RubricLevel | null }
  const [marks, setMarks] = useState<Record<number, RubricLevel | null>>({});
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingSave, setPendingSave] = useState<(() => Promise<void>) | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, termsRes, pathwaysRes, ssRes, rubricRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('cbc_pathways').select('*').order('pathway_name'),
      supabase.from('cbc_student_subjects').select('*'),
      supabase.from('cbc_rubric_config').select('*').order('sort_order'),
    ]);

    const allForms = formsRes.data || [];
    const cbcForms = allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School');

    setForms(cbcForms);
    setStreams(streamsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTerms(termsRes.data || []);
    setPathways(pathwaysRes.data || []);
    setStudentSubjects(ssRes.data || []);
    setRubricConfig(rubricRes.data || []);

    const cur = (termsRes.data || []).find((t: any) => t.is_current);
    if (cur) setSelTerm(String(cur.id));

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch students for selected form/stream
  useEffect(() => {
    if (!selForm) { setStudents([]); return; }
    const load = async () => {
      const query = supabase
        .from('school_students')
        .select('*')
        .eq('form_id', Number(selForm))
        .eq('status', 'Active')
        .order('first_name');
      if (selStream) query.eq('stream_id', Number(selStream));
      const { data } = await query;
      setStudents(data || []);
    };
    load();
  }, [selForm, selStream]);

  // Fetch existing assessments when filters change
  useEffect(() => {
    if (!selForm || !selTerm || !selSubject) { setAssessments([]); return; }
    const load = async () => {
      const studentIds = getStudentsForSubject(Number(selSubject), studentSubjects);
      if (studentIds.length === 0) { setAssessments([]); return; }
      const { data } = await supabase
        .from('cbc_assessments')
        .select('*')
        .in('student_id', studentIds)
        .eq('subject_id', Number(selSubject))
        .eq('term_id', Number(selTerm));
      setAssessments(data || []);
    };
    load();
  }, [selForm, selTerm, selSubject, studentSubjects]);

  // Pre-populate marks from existing assessments
  useEffect(() => {
    if (!selSubject || !selTerm) return;
    const newMarks: Record<number, RubricLevel | null> = {};
    enrolledStudents.forEach(student => {
      const existing = assessments.find(
        a => a.student_id === student.id &&
          a.assessment_type === selAssessmentType &&
          (selAssessmentType === 'Summative' || a.task_name === taskName)
      );
      newMarks[student.id] = existing?.rubric_level || null;
    });
    setMarks(newMarks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assessments, selAssessmentType, taskName]);

  // Students enrolled in the selected subject
  const enrolledStudentIds = selSubject
    ? getStudentsForSubject(Number(selSubject), studentSubjects)
    : [];
  const enrolledStudents = students.filter(s => enrolledStudentIds.includes(s.id));

  // Subjects available for the selected form/stream (via cbc_student_subjects)
  const availableSubjectIds = new Set(
    studentSubjects
      .filter(ss => students.some(s => s.id === ss.student_id))
      .map(ss => ss.subject_id)
  );
  const availableSubjects = subjects.filter(s => availableSubjectIds.has(s.id));

  const assessedCount = Object.values(marks).filter(v => v !== null).length;
  const totalCount = enrolledStudents.length;

  const handleLevelChange = (studentId: number, level: RubricLevel) => {
    setMarks(prev => ({ ...prev, [studentId]: level }));
    // Auto-save after 2s idle
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      triggerSave(false);
    }, 2000);
  };

  const triggerSave = async (force: boolean) => {
    if (!selSubject || !selTerm || !selAssessmentType) return;

    const doSave = async () => {
      setSaving(true);
      try {
        const user = JSON.parse(localStorage.getItem('school_user') || '{}');
        const teacherId = user?.id || null;

        for (const student of enrolledStudents) {
          const level = marks[student.id];
          if (!level) continue;

          if (selAssessmentType === 'Summative') {
            // Upsert summative (unique per student/subject/term)
            await supabase.from('cbc_assessments').upsert({
              student_id: student.id,
              subject_id: Number(selSubject),
              term_id: Number(selTerm),
              assessment_type: 'Summative',
              task_name: 'Summative',
              rubric_level: level,
              teacher_id: teacherId,
              assessed_at: new Date().toISOString(),
            }, { onConflict: 'student_id,subject_id,term_id' });
          } else {
            // Formative: upsert by student/subject/term/task_name
            const { data: existing } = await supabase
              .from('cbc_assessments')
              .select('id')
              .eq('student_id', student.id)
              .eq('subject_id', Number(selSubject))
              .eq('term_id', Number(selTerm))
              .eq('assessment_type', 'Formative')
              .eq('task_name', taskName || 'Formative Task')
              .maybeSingle();

            if (existing) {
              await supabase.from('cbc_assessments').update({
                rubric_level: level,
                assessed_at: new Date().toISOString(),
              }).eq('id', existing.id);
            } else {
              await supabase.from('cbc_assessments').insert({
                student_id: student.id,
                subject_id: Number(selSubject),
                term_id: Number(selTerm),
                assessment_type: 'Formative',
                task_name: taskName || 'Formative Task',
                rubric_level: level,
                teacher_id: teacherId,
                assessed_at: new Date().toISOString(),
              });
            }
          }

          // Recompute competency summary inline
          await recomputeSummaryInline(student.id, Number(selSubject), Number(selTerm));
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
      // Check for existing summative
      const existingSummative = assessments.find(
        a => a.assessment_type === 'Summative'
      );
      if (existingSummative) {
        setPendingSave(() => doSave);
        setShowConfirm(true);
        return;
      }
    }

    await doSave();
  };

  const recomputeSummaryInline = async (studentId: number, subjectId: number, termId: number) => {
    const { data: allAssessments } = await supabase
      .from('cbc_assessments')
      .select('*')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('term_id', termId);

    if (!allAssessments) return;

    const formativeEntries = allAssessments.filter(a => a.assessment_type === 'Formative');
    const summativeEntry = allAssessments.find(a => a.assessment_type === 'Summative');

    const formativeLevels = formativeEntries
      .map(a => a.rubric_level as RubricLevel)
      .filter(Boolean);

    const formativeLevel = formativeLevels.length > 0
      ? computeCompetencySummary(formativeLevels)
      : null;
    const summativeLevel = summativeEntry?.rubric_level as RubricLevel | null || null;

    let overallLevel: RubricLevel | null = null;
    if (formativeLevel && summativeLevel) {
      overallLevel = computeWeightedSummary(formativeLevel, summativeLevel);
    } else if (formativeLevel) {
      overallLevel = formativeLevel;
    } else if (summativeLevel) {
      overallLevel = summativeLevel;
    }

    await supabase.from('cbc_competency_summaries').upsert({
      student_id: studentId,
      subject_id: subjectId,
      term_id: termId,
      formative_level: formativeLevel,
      summative_level: summativeLevel,
      overall_level: overallLevel,
      formative_count: formativeLevels.length,
      last_computed_at: new Date().toISOString(),
    }, { onConflict: 'student_id,subject_id,term_id' });
  };

  const exportCSV = () => {
    const subjectName = subjects.find(s => s.id === Number(selSubject))?.subject_name || '';
    const termName = terms.find(t => t.id === Number(selTerm))?.term_name || '';
    const headers = ['Adm No', 'Student Name', 'Subject', 'Assessment Type', 'Task Name', 'Rubric Level', 'Term'];
    const rows = enrolledStudents.map(student => [
      student.admission_no || student.admission_number || '',
      `${student.first_name} ${student.last_name}`,
      subjectName,
      selAssessmentType,
      selAssessmentType === 'Formative' ? (taskName || 'Formative Task') : 'Summative',
      marks[student.id] || 'Not Assessed',
      termName,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cbc-marks-${subjectName}-${termName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isReady = selForm && selStream !== undefined && selSubject && selTerm && selAssessmentType &&
    (selAssessmentType === 'Summative' || taskName.trim().length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
          <p className="text-gray-400 text-sm">Loading CBC Marks Entry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Confirm overwrite dialog */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Overwrite Summative Assessment?</h3>
            <p className="text-sm text-gray-600 mb-5">
              A summative assessment already exists for this subject and term. Saving will overwrite the existing records. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowConfirm(false); setPendingSave(null); }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowConfirm(false);
                  if (pendingSave) await pendingSave();
                  setPendingSave(null);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiFileText className="text-indigo-500" /> CBC Mark Entry
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter rubric levels (EE/ME/AE/BE) for Grade 10 CBC students
          </p>
        </div>
        {isReady && enrolledStudents.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={exportCSV}
              className="px-4 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl flex items-center gap-2 hover:bg-gray-50"
            >
              <FiDownload size={14} /> Export CSV
            </button>
            <button
              onClick={() => triggerSave(false)}
              disabled={saving}
              className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              {saving ? 'Saving...' : 'Save Marks'}
            </button>
          </div>
        )}
      </div>

      {/* Selection bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Form (CBC) *</label>
            <select
              value={selForm}
              onChange={e => { setSelForm(e.target.value); setSelStream(''); setSelSubject(''); }}
              className="select-modern w-full text-sm"
            >
              <option value="">Select Form</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.form_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Stream</label>
            <select
              value={selStream}
              onChange={e => { setSelStream(e.target.value); setSelSubject(''); }}
              className="select-modern w-full text-sm"
            >
              <option value="">All Streams</option>
              {streams.map(s => (
                <option key={s.id} value={s.id}>{s.stream_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Subject *</label>
            <select
              value={selSubject}
              onChange={e => setSelSubject(e.target.value)}
              className="select-modern w-full text-sm"
              disabled={!selForm}
            >
              <option value="">Select Subject</option>
              {availableSubjects.map(s => (
                <option key={s.id} value={s.id}>{s.subject_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Term *</label>
            <select
              value={selTerm}
              onChange={e => setSelTerm(e.target.value)}
              className="select-modern w-full text-sm"
            >
              <option value="">Select Term</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.term_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Assessment Type *</label>
            <select
              value={selAssessmentType}
              onChange={e => setSelAssessmentType(e.target.value as 'Formative' | 'Summative')}
              className="select-modern w-full text-sm"
            >
              <option value="Formative">Formative</option>
              <option value="Summative">Summative</option>
            </select>
          </div>
          {selAssessmentType === 'Formative' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Task Name *</label>
              <input
                type="text"
                value={taskName}
                onChange={e => setTaskName(e.target.value)}
                placeholder="e.g. Task 1"
                className="input-modern w-full text-sm"
              />
            </div>
          )}
        </div>
      </div>

      {/* Completion indicator */}
      {isReady && enrolledStudents.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
          <FiCheckCircle className={assessedCount === totalCount ? 'text-green-500' : 'text-indigo-400'} size={18} />
          <p className="text-sm font-semibold text-indigo-800">
            {assessedCount} / {totalCount} students assessed
          </p>
          {saving && <span className="text-xs text-indigo-500 ml-auto animate-pulse">Auto-saving...</span>}
        </div>
      )}

      {/* Marks grid */}
      {!isReady ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
          <span className="text-5xl block mb-4">📝</span>
          <p className="font-semibold text-lg">Select all required filters to enter marks</p>
          <p className="text-xs mt-1">Form, Subject, Term, Assessment Type{selAssessmentType === 'Formative' ? ', and Task Name' : ''} are required</p>
        </div>
      ) : enrolledStudents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
          <span className="text-5xl block mb-4">👥</span>
          <p className="font-semibold">No students enrolled in this subject</p>
          <p className="text-xs mt-1">Assign students to this subject via the Students page</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-700">
              {subjects.find(s => s.id === Number(selSubject))?.subject_name} —{' '}
              {selAssessmentType === 'Formative' ? taskName : 'Summative Assessment'}
            </h2>
            <div className="flex gap-2">
              {(['EE', 'ME', 'AE', 'BE'] as RubricLevel[]).map(level => (
                <RubricLevelBadge key={level} level={level} rubricConfig={rubricConfig} size="sm" />
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Adm No</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Student Name</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Rubric Level</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">Current</th>
                </tr>
              </thead>
              <tbody>
                {enrolledStudents.map((student, idx) => {
                  const currentLevel = marks[student.id] || null;
                  return (
                    <tr key={student.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-4 py-3 text-xs text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                        {student.admission_no || student.admission_number || '—'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-800">
                        {student.first_name} {student.last_name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {(['EE', 'ME', 'AE', 'BE'] as RubricLevel[]).map(level => (
                            <button
                              key={level}
                              onClick={() => handleLevelChange(student.id, level)}
                              className={`px-2 py-1 rounded-lg text-xs font-bold border-2 transition-all ${
                                currentLevel === level
                                  ? 'text-white border-transparent'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'
                              }`}
                              style={
                                currentLevel === level
                                  ? { background: rubricConfig.find(r => r.level_code === level)?.color_hex || '#6366f1' }
                                  : {}
                              }
                            >
                              {level}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <RubricLevelBadge level={currentLevel} rubricConfig={rubricConfig} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

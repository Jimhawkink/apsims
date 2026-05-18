'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import CBCReportCardTemplate from '@/components/cbc/CBCReportCardTemplate';
import RubricLevelBadge from '@/components/cbc/RubricLevelBadge';
import PathwayBadge from '@/components/cbc/PathwayBadge';
import toast from 'react-hot-toast';
import { FiPrinter, FiDownload, FiFileText, FiEye, FiUsers } from 'react-icons/fi';

export default function CBCReportCardsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [pathways, setPathways] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [rubricConfig, setRubricConfig] = useState<any[]>([]);
  const [comments, setComments] = useState<Record<number, { teacher_comment: string; principal_comment: string }>>({});
  const [schoolDetails, setSchoolDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [selStream, setSelStream] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [previewStudentId, setPreviewStudentId] = useState<number | null>(null);
  const [printAll, setPrintAll] = useState(false);
  const [savingComment, setSavingComment] = useState<number | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, termsRes, pathwaysRes, subjectsRes, ssRes, rubricRes, sdRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('cbc_pathways').select('*').order('pathway_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('cbc_student_subjects').select('*'),
      supabase.from('cbc_rubric_config').select('*').order('sort_order'),
      supabase.from('school_details').select('*').limit(1).maybeSingle(),
    ]);

    const allForms = formsRes.data || [];
    const cbcForms = allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School');
    const cbcFormIds = cbcForms.map(f => f.id);

    setForms(allForms);
    setStreams(streamsRes.data || []);
    setTerms(termsRes.data || []);
    setPathways(pathwaysRes.data || []);
    setSchoolSubjects(subjectsRes.data || []);
    setStudentSubjects(ssRes.data || []);
    setRubricConfig(rubricRes.data || []);
    setSchoolDetails(sdRes.data);

    const cur = (termsRes.data || []).find((t: any) => t.is_current);
    if (cur) setSelTerm(String(cur.id));

    // Fetch Grade 10 students
    if (cbcFormIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('school_students')
        .select('*')
        .in('form_id', cbcFormIds)
        .eq('status', 'Active')
        .order('first_name');
      setStudents(studentsData || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch mark scores (NOT the empty cbc_competency_summaries) and comments
  useEffect(() => {
    if (!selTerm) return;
    const load = async () => {
      const [scoresRes, commentsRes] = await Promise.all([
        supabase.from('cbc_mark_scores').select('*').eq('term_id', Number(selTerm)),
        supabase.from('cbc_report_card_comments').select('*').eq('term_id', Number(selTerm)),
      ]);

      // Compute per-student per-subject summaries from raw mark scores
      const rawScores = scoresRes.data || [];
      const grouped: Record<string, any[]> = {};
      for (const s of rawScores) {
        const key = `${s.student_id}-${s.subject_id}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      }

      const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;
      const WEIGHTS: Record<string, number> = { EE: 4, ME: 3, AE: 2, BE: 1 };
      const NUM_TO_LEVEL: Record<number, string> = { 4: 'EE', 3: 'ME', 2: 'AE', 1: 'BE' };

      const computedSummaries: any[] = [];
      for (const [, group] of Object.entries(grouped)) {
        const { student_id, subject_id, term_id } = group[0];
        const formative = group.filter((g: any) => g.assessment_type === 'Formative' && g.rubric_level);
        const summative = group.filter((g: any) => g.assessment_type === 'Summative' && g.rubric_level);

        // Mode of rubric levels
        const modeLevel = (items: any[]) => {
          if (!items.length) return null;
          const counts: Record<string, number> = {};
          items.forEach(i => { counts[i.rubric_level] = (counts[i.rubric_level] || 0) + 1; });
          let best: string | null = null, bestC = 0;
          for (const lvl of LEVELS) { if ((counts[lvl] || 0) > bestC) { best = lvl; bestC = counts[lvl] || 0; } }
          return best;
        };

        const fLevel = modeLevel(formative);
        const sLevel = modeLevel(summative);
        let overall: string | null = null;
        if (fLevel && sLevel) {
          const w = Math.round((WEIGHTS[sLevel] || 0) * 0.6 + (WEIGHTS[fLevel] || 0) * 0.4);
          overall = NUM_TO_LEVEL[Math.max(1, Math.min(4, w))] || 'BE';
        } else {
          overall = sLevel || fLevel;
        }

        computedSummaries.push({ student_id, subject_id, term_id, formative_level: fLevel, summative_level: sLevel, overall_level: overall });
      }

      setSummaries(computedSummaries);

      const commentsMap: Record<number, { teacher_comment: string; principal_comment: string }> = {};
      (commentsRes.data || []).forEach((c: any) => {
        commentsMap[c.student_id] = {
          teacher_comment: c.teacher_comment || '',
          principal_comment: c.principal_comment || '',
        };
      });
      setComments(commentsMap);
    };
    load();
  }, [selTerm]);

  // Filtered students
  const filteredStudents = students.filter(s => {
    if (selStream && String(s.stream_id) !== selStream) return false;
    return true;
  });

  const getStudentSubjectList = (studentId: number) => {
    const enrolled = studentSubjects.filter(ss => ss.student_id === studentId);
    return enrolled.map(ss => schoolSubjects.find(s => s.id === ss.subject_id)).filter(Boolean);
  };

  const getStudentPathway = (studentId: number) => {
    const ss = studentSubjects.find(s => s.student_id === studentId && s.pathway_id);
    if (!ss) return null;
    return pathways.find(p => p.id === ss.pathway_id) || null;
  };

  const getStudentSummaries = (studentId: number) =>
    summaries.filter(s => s.student_id === studentId);

  const getStreamName = (streamId: number) =>
    streams.find(s => s.id === streamId)?.stream_name || '—';

  const getTermObj = () => terms.find(t => String(t.id) === selTerm) || null;

  const handleCommentChange = (studentId: number, field: 'teacher_comment' | 'principal_comment', value: string) => {
    setComments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        teacher_comment: prev[studentId]?.teacher_comment || '',
        principal_comment: prev[studentId]?.principal_comment || '',
        [field]: value,
      },
    }));
  };

  const saveComment = async (studentId: number) => {
    if (!selTerm) return;
    setSavingComment(studentId);
    const comment = comments[studentId] || { teacher_comment: '', principal_comment: '' };
    const { error } = await supabase.from('cbc_report_card_comments').upsert({
      student_id: studentId,
      term_id: Number(selTerm),
      teacher_comment: comment.teacher_comment,
      principal_comment: comment.principal_comment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'student_id,term_id' });

    if (error) {
      toast.error('Failed to save comment');
    } else {
      toast.success('Comment saved');
    }
    setSavingComment(null);
  };

  const handlePrint = (studentId?: number) => {
    if (studentId) {
      setPreviewStudentId(studentId);
      setPrintAll(false);
    } else {
      setPrintAll(true);
      setPreviewStudentId(null);
    }
    setTimeout(() => window.print(), 300);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
          <p className="text-gray-400 text-sm">Loading CBC Report Cards...</p>
        </div>
      </div>
    );
  }

  const previewStudent = previewStudentId ? students.find(s => s.id === previewStudentId) : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { size: A4 portrait; margin: 10mm; }
        }
      `}</style>

      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiFileText className="text-indigo-500" /> CBC Report Cards
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Grade 10 CBC Senior School — Competency-based report cards
          </p>
        </div>
        {filteredStudents.length > 0 && selTerm && (
          <button
            onClick={() => handlePrint()}
            className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow"
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
          >
            <FiUsers size={14} /> Generate All ({filteredStudents.length})
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="no-print bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Stream</label>
            <select
              value={selStream}
              onChange={e => setSelStream(e.target.value)}
              className="select-modern w-full text-sm"
            >
              <option value="">All Streams</option>
              {streams.map(s => (
                <option key={s.id} value={s.id}>{s.stream_name}</option>
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
          <div className="flex items-end">
            <p className="text-sm text-gray-500">
              <span className="font-bold text-gray-800">{filteredStudents.length}</span> students
            </p>
          </div>
        </div>
      </div>

      {/* Student list */}
      {!selTerm ? (
        <div className="no-print bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
          <span className="text-5xl block mb-4">🎓</span>
          <p className="font-semibold text-lg">Select a term to generate report cards</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="no-print bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
          <span className="text-5xl block mb-4">👥</span>
          <p className="font-semibold">No Grade 10 students found</p>
        </div>
      ) : (
        <div className="no-print space-y-4">
          {filteredStudents.map(student => {
            const pathway = getStudentPathway(student.id);
            const studentSubs = getStudentSubjectList(student.id);
            const studentSummaries = getStudentSummaries(student.id);
            const comment = comments[student.id] || { teacher_comment: '', principal_comment: '' };
            const isPreview = previewStudentId === student.id;

            return (
              <div key={student.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Student header row */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                      {student.first_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {student.first_name} {student.last_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {student.admission_no || student.admission_number} · {getStreamName(student.stream_id)}
                      </p>
                    </div>
                    {pathway && (
                      <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPreviewStudentId(isPreview ? null : student.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-1 hover:bg-indigo-100"
                    >
                      <FiEye size={12} /> {isPreview ? 'Hide' : 'Preview'}
                    </button>
                    <button
                      onClick={() => handlePrint(student.id)}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-500 rounded-lg flex items-center gap-1 hover:bg-indigo-600"
                    >
                      <FiPrinter size={12} /> Print
                    </button>
                  </div>
                </div>

                {/* Subject summary chips */}
                <div className="px-4 py-2 flex flex-wrap gap-1.5 border-b border-gray-50">
                  {studentSubs.map((sub: any) => {
                    const summary = studentSummaries.find(s => s.subject_id === sub.id);
                    return (
                      <div key={sub.id} className="flex items-center gap-1 px-2 py-1 bg-gray-50 rounded-lg border border-gray-100">
                        <span className="text-[10px] font-semibold text-gray-600">{sub.subject_name}</span>
                        <RubricLevelBadge level={summary?.overall_level || null} rubricConfig={rubricConfig} size="sm" />
                      </div>
                    );
                  })}
                  {studentSubs.length === 0 && (
                    <span className="text-xs text-gray-400 italic">No subjects assigned</span>
                  )}
                </div>

                {/* Comments */}
                <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Teacher Comment</label>
                    <textarea
                      value={comment.teacher_comment}
                      onChange={e => handleCommentChange(student.id, 'teacher_comment', e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Enter teacher's comment..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Principal Comment</label>
                    <textarea
                      value={comment.principal_comment}
                      onChange={e => handleCommentChange(student.id, 'principal_comment', e.target.value)}
                      rows={2}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Enter principal's comment..."
                    />
                  </div>
                  <div className="sm:col-span-2 flex justify-end">
                    <button
                      onClick={() => saveComment(student.id)}
                      disabled={savingComment === student.id}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-60"
                    >
                      {savingComment === student.id ? 'Saving...' : 'Save Comments'}
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {isPreview && (
                  <div className="border-t border-gray-100 p-4">
                    <CBCReportCardTemplate
                      student={{ ...student, stream_name: getStreamName(student.stream_id) }}
                      pathway={pathway}
                      subjects={studentSubs}
                      summaries={studentSummaries}
                      rubricConfig={rubricConfig}
                      schoolDetails={schoolDetails}
                      term={getTermObj()}
                      comments={comment}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Print area — renders all or single student */}
      <div className="print-area" ref={printRef}>
        {printAll
          ? filteredStudents.map(student => {
              const pathway = getStudentPathway(student.id);
              const studentSubs = getStudentSubjectList(student.id);
              const studentSummaries = getStudentSummaries(student.id);
              const comment = comments[student.id] || { teacher_comment: '', principal_comment: '' };
              return (
                <CBCReportCardTemplate
                  key={student.id}
                  student={{ ...student, stream_name: getStreamName(student.stream_id) }}
                  pathway={pathway}
                  subjects={studentSubs}
                  summaries={studentSummaries}
                  rubricConfig={rubricConfig}
                  schoolDetails={schoolDetails}
                  term={getTermObj()}
                  comments={comment}
                />
              );
            })
          : previewStudent
          ? (() => {
              const pathway = getStudentPathway(previewStudent.id);
              const studentSubs = getStudentSubjectList(previewStudent.id);
              const studentSummaries = getStudentSummaries(previewStudent.id);
              const comment = comments[previewStudent.id] || { teacher_comment: '', principal_comment: '' };
              return (
                <CBCReportCardTemplate
                  student={{ ...previewStudent, stream_name: getStreamName(previewStudent.stream_id) }}
                  pathway={pathway}
                  subjects={studentSubs}
                  summaries={studentSummaries}
                  rubricConfig={rubricConfig}
                  schoolDetails={schoolDetails}
                  term={getTermObj()}
                  comments={comment}
                />
              );
            })()
          : null}
      </div>
    </div>
  );
}

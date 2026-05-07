'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import PathwayBadge from '@/components/cbc/PathwayBadge';
import { FiDownload, FiAlertTriangle, FiGrid } from 'react-icons/fi';

export default function SubjectCombinationsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [pathways, setPathways] = useState<any[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterPathway, setFilterPathway] = useState('');
  const [filterStream, setFilterStream] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, pathwaysRes, studentSubjectsRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('cbc_pathways').select('*').order('pathway_name'),
      supabase.from('cbc_student_subjects').select('*'),
    ]);

    const allForms = formsRes.data || [];
    const cbcForms = allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School');
    const cbcFormIds = cbcForms.map(f => f.id);

    setForms(allForms);
    setStreams(streamsRes.data || []);
    setSchoolSubjects(subjectsRes.data || []);
    setPathways(pathwaysRes.data || []);
    setStudentSubjects(studentSubjectsRes.data || []);

    // Fetch Grade 10 (CBC) students
    if (cbcFormIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('school_students')
        .select('*')
        .in('form_id', cbcFormIds)
        .eq('status', 'Active')
        .order('first_name');
      setStudents(studentsData || []);
    } else {
      setStudents([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Derived data
  const getStudentSubjects = (studentId: number) => {
    const enrolled = studentSubjects.filter(ss => ss.student_id === studentId);
    return enrolled.map(ss => schoolSubjects.find(s => s.id === ss.subject_id)).filter(Boolean);
  };

  const getStudentPathway = (studentId: number) => {
    const ss = studentSubjects.find(s => s.student_id === studentId && s.pathway_id);
    if (!ss) return null;
    return pathways.find(p => p.id === ss.pathway_id) || null;
  };

  const getStreamName = (streamId: number) =>
    streams.find(s => s.id === streamId)?.stream_name || '—';

  // Students with no pathway
  const studentsWithoutPathway = students.filter(s => !getStudentPathway(s.id));

  // Filtered students
  const filteredStudents = students.filter(student => {
    if (filterStream && String(student.stream_id) !== filterStream) return false;
    if (filterPathway) {
      const pathway = getStudentPathway(student.id);
      if (!pathway || String(pathway.id) !== filterPathway) return false;
    }
    return true;
  });

  // Export to CSV
  const exportCSV = () => {
    const headers = ['#', 'Adm No', 'Student Name', 'Stream', 'Pathway', 'Subject 1', 'Subject 2', 'Subject 3', 'Subject 4', 'Subject 5', 'Subject 6', 'Subject 7'];
    const rows = filteredStudents.map((student, idx) => {
      const pathway = getStudentPathway(student.id);
      const subs = getStudentSubjects(student.id);
      const subNames = Array.from({ length: 7 }, (_, i) => subs[i]?.subject_name || '');
      return [
        idx + 1,
        student.admission_no || student.admission_number || '',
        `${student.first_name} ${student.last_name}`,
        getStreamName(student.stream_id),
        pathway?.pathway_name || 'Not Assigned',
        ...subNames,
      ];
    });

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cbc-subject-combinations.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
          <p className="text-gray-400 text-sm">Loading subject combinations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiGrid className="text-indigo-500" /> CBC Subject Combinations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Grade 10 students — 4 compulsory + 3 elective subjects per pathway
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow"
          style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
        >
          <FiDownload size={14} /> Export CSV
        </button>
      </div>

      {/* Warning banner */}
      {studentsWithoutPathway.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {studentsWithoutPathway.length} active Grade 10 student{studentsWithoutPathway.length > 1 ? 's have' : ' has'} no pathway assigned
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {studentsWithoutPathway.map(s => `${s.first_name} ${s.last_name}`).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Pathway</label>
            <select
              value={filterPathway}
              onChange={e => setFilterPathway(e.target.value)}
              className="select-modern w-full text-sm"
            >
              <option value="">All Pathways</option>
              {pathways.map(p => (
                <option key={p.id} value={p.id}>{p.pathway_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Stream</label>
            <select
              value={filterStream}
              onChange={e => setFilterStream(e.target.value)}
              className="select-modern w-full text-sm"
            >
              <option value="">All Streams</option>
              {streams.map(s => (
                <option key={s.id} value={s.id}>{s.stream_name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-800">{filteredStudents.length}</span> of{' '}
              <span className="font-bold text-gray-800">{students.length}</span> students
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Adm No</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Student Name</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Stream</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Pathway</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Subjects (7)</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-gray-400">
                    <span className="text-4xl block mb-3">📚</span>
                    <p className="font-semibold">No Grade 10 students found</p>
                    <p className="text-xs mt-1">Adjust filters or enroll Grade 10 students first</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, idx) => {
                  const pathway = getStudentPathway(student.id);
                  const subs = getStudentSubjects(student.id);
                  return (
                    <tr key={student.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                      <td className="px-4 py-3 text-xs text-gray-400 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-mono text-blue-600 font-semibold">
                        {student.admission_no || student.admission_number || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold text-gray-800">
                          {student.first_name} {student.last_name}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getStreamName(student.stream_id)}
                      </td>
                      <td className="px-4 py-3">
                        {pathway ? (
                          <PathwayBadge
                            pathwayName={pathway.pathway_name}
                            colorHex={pathway.color_hex}
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-semibold">
                            <FiAlertTriangle size={11} /> Not Assigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {subs.length === 0 ? (
                            <span className="text-xs text-gray-400 italic">No subjects assigned</span>
                          ) : (
                            subs.map((sub: any) => (
                              <span
                                key={sub.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                              >
                                {sub.subject_name}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

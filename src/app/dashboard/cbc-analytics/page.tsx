'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import RubricLevelBadge from '@/components/cbc/RubricLevelBadge';
import PathwayBadge from '@/components/cbc/PathwayBadge';
import { FiBarChart2, FiUsers, FiAlertTriangle, FiTrendingUp } from 'react-icons/fi';

const RUBRIC_LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

export default function CBCAnalyticsPage() {
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [pathways, setPathways] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSubjects, setStudentSubjects] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [rubricConfig, setRubricConfig] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selTerm, setSelTerm] = useState('');
  const [selPathway, setSelPathway] = useState('');
  const [selStream, setSelStream] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, termsRes, pathwaysRes, subjectsRes, ssRes, rubricRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('cbc_pathways').select('*').order('pathway_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('cbc_student_subjects').select('*'),
      supabase.from('cbc_rubric_config').select('*').order('sort_order'),
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

    const cur = (termsRes.data || []).find((t: any) => t.is_current);
    if (cur) setSelTerm(String(cur.id));

    if (cbcFormIds.length > 0) {
      const { data: studentsData } = await supabase
        .from('school_students')
        .select('*')
        .in('form_id', cbcFormIds)
        .eq('status', 'Active');
      setStudents(studentsData || []);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Fetch summaries when term changes
  useEffect(() => {
    if (!selTerm) return;
    const load = async () => {
      const { data } = await supabase
        .from('cbc_competency_summaries')
        .select('*')
        .eq('term_id', Number(selTerm));
      setSummaries(data || []);
    };
    load();
  }, [selTerm]);

  // Filtered students
  const filteredStudents = students.filter(s => {
    if (selStream && String(s.stream_id) !== selStream) return false;
    if (selPathway) {
      const ss = studentSubjects.find(sub => sub.student_id === s.id && String(sub.pathway_id) === selPathway);
      if (!ss) return false;
    }
    return true;
  });

  const filteredStudentIds = new Set(filteredStudents.map(s => s.id));

  // Filtered summaries
  const filteredSummaries = summaries.filter(s => filteredStudentIds.has(s.student_id));

  // Students per pathway
  const studentsPerPathway = pathways.map(pathway => {
    const count = students.filter(s => {
      const ss = studentSubjects.find(sub => sub.student_id === s.id && sub.pathway_id === pathway.id);
      return Boolean(ss);
    }).length;
    return { ...pathway, count };
  });

  // % achieving ME or above
  const totalAssessed = filteredSummaries.filter(s => s.overall_level).length;
  const meOrAbove = filteredSummaries.filter(s => s.overall_level === 'EE' || s.overall_level === 'ME').length;
  const mePercent = totalAssessed > 0 ? Math.round((meOrAbove / totalAssessed) * 100) : 0;

  // Per-subject rubric distribution
  const subjectIds = new Set(filteredSummaries.map(s => s.subject_id));
  const subjectStats = Array.from(subjectIds).map(subjectId => {
    const subject = schoolSubjects.find(s => s.id === subjectId);
    const subSummaries = filteredSummaries.filter(s => s.subject_id === subjectId && s.overall_level);
    const total = subSummaries.length;
    const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
    subSummaries.forEach(s => { if (s.overall_level) counts[s.overall_level]++; });
    const meAboveCount = (counts.EE || 0) + (counts.ME || 0);
    const meAbovePct = total > 0 ? Math.round((meAboveCount / total) * 100) : 0;
    const warn = total > 0 && meAbovePct < 50;

    // Formative vs summative
    const formativeSummaries = filteredSummaries.filter(s => s.subject_id === subjectId && s.formative_level);
    const summativeSummaries = filteredSummaries.filter(s => s.subject_id === subjectId && s.summative_level);
    const formativeCounts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
    const summativeCounts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
    formativeSummaries.forEach(s => { if (s.formative_level) formativeCounts[s.formative_level]++; });
    summativeSummaries.forEach(s => { if (s.summative_level) summativeCounts[s.summative_level]++; });

    return { subject, subjectId, total, counts, meAbovePct, warn, formativeCounts, summativeCounts };
  }).filter(s => s.subject);

  const getRubricColor = (level: string) => {
    const config = rubricConfig.find(r => r.level_code === level);
    return config?.color_hex || (level === 'EE' ? '#15803d' : level === 'ME' ? '#1d4ed8' : level === 'AE' ? '#b45309' : '#b91c1c');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
          <p className="text-gray-400 text-sm">Loading CBC Analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <FiBarChart2 className="text-indigo-500" /> CBC Analytics Dashboard
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Grade 10 CBC Senior School — Competency performance overview
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Term</label>
            <select
              value={selTerm}
              onChange={e => setSelTerm(e.target.value)}
              className="select-modern w-full text-sm"
            >
              <option value="">All Terms</option>
              {terms.map(t => (
                <option key={t.id} value={t.id}>{t.term_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Pathway</label>
            <select
              value={selPathway}
              onChange={e => setSelPathway(e.target.value)}
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
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total students */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-2">
            <FiUsers className="text-indigo-500" size={18} />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Grade 10</p>
          </div>
          <p className="text-3xl font-black text-gray-800">{filteredStudents.length}</p>
          <p className="text-xs text-gray-400 mt-1">Active students</p>
        </div>

        {/* Per pathway */}
        {studentsPerPathway.map(pathway => (
          <div key={pathway.id} className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="mb-2">
              <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} />
            </div>
            <p className="text-3xl font-black text-gray-800">{pathway.count}</p>
            <p className="text-xs text-gray-400 mt-1">students</p>
          </div>
        ))}

        {/* ME or above */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FiTrendingUp className="text-green-500" size={18} />
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">ME or Above</p>
          </div>
          <p className="text-3xl font-black text-gray-800">{mePercent}%</p>
          <p className="text-xs text-gray-400 mt-1">{meOrAbove} of {totalAssessed} assessed</p>
        </div>
      </div>

      {/* Per-subject rubric distribution */}
      {subjectStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700">Subject Rubric Distribution</h2>
            <p className="text-xs text-gray-400 mt-0.5">Overall competency levels per subject</p>
          </div>
          <div className="divide-y divide-gray-100">
            {subjectStats.map(({ subject, total, counts, meAbovePct, warn }) => (
              <div key={subject.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{subject.subject_name}</span>
                    {warn && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <FiAlertTriangle size={9} /> &lt;50% ME+
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">{total} assessed</span>
                </div>
                {/* Progress bars */}
                <div className="space-y-1.5">
                  {RUBRIC_LEVELS.map(level => {
                    const count = counts[level] || 0;
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    const color = getRubricColor(level);
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold w-6 text-right" style={{ color }}>{level}</span>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-12 text-right">{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formative vs Summative comparison table */}
      {subjectStats.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-700">Formative vs Summative Comparison</h2>
            <p className="text-xs text-gray-400 mt-0.5">Level distribution by assessment type</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">Subject</th>
                  {RUBRIC_LEVELS.map(level => (
                    <th key={`f-${level}`} className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                      F-{level}
                    </th>
                  ))}
                  {RUBRIC_LEVELS.map(level => (
                    <th key={`s-${level}`} className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                      S-{level}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjectStats.map(({ subject, formativeCounts, summativeCounts }, idx) => (
                  <tr key={subject.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800">{subject.subject_name}</td>
                    {RUBRIC_LEVELS.map(level => (
                      <td key={`f-${level}`} className="px-3 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: getRubricColor(level) }}>
                          {formativeCounts[level] || 0}
                        </span>
                      </td>
                    ))}
                    {RUBRIC_LEVELS.map(level => (
                      <td key={`s-${level}`} className="px-3 py-3 text-center">
                        <span className="text-xs font-bold" style={{ color: getRubricColor(level) }}>
                          {summativeCounts[level] || 0}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">F = Formative · S = Summative · Counts show number of students at each level</p>
          </div>
        </div>
      )}

      {subjectStats.length === 0 && selTerm && (
        <div className="bg-white rounded-2xl border border-gray-200 text-center py-20 text-gray-400">
          <span className="text-5xl block mb-4">📊</span>
          <p className="font-semibold">No assessment data found for the selected filters</p>
          <p className="text-xs mt-1">Enter marks via CBC Mark Entry to see analytics</p>
        </div>
      )}
    </div>
  );
}

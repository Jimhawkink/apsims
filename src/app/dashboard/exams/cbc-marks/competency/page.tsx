'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import CBCNavBar from '@/components/cbc/CBCNavBar';
import {
  FiAward, FiUsers, FiTrendingUp, FiTrendingDown, FiMinus,
  FiTarget, FiBook, FiBarChart2, FiAlertTriangle, FiCheckCircle,
  FiFilter, FiDownload, FiChevronRight,
} from 'react-icons/fi';

const RC = {
  EE: { bar: '#1D9E75', text: '#0F6E56', bg: '#E1F5EE' },
  ME: { bar: '#378ADD', text: '#185FA5', bg: '#E6F1FB' },
  AE: { bar: '#EF9F27', text: '#854F0B', bg: '#FAEEDA' },
  BE: { bar: '#E24B4A', text: '#A32D2D', bg: '#FCEBEB' },
};

function LevelBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded bg-gray-100">—</span>;
  const c = RC[level as keyof typeof RC] || { bg: '#f3f4f6', text: '#666' };
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: c.bg, color: c.text }}>{level}</span>;
}

function TrendArrow({ current, prev }: { current: string | null; prev: string | null }) {
  if (!current || !prev) return <FiMinus size={12} className="text-gray-400" />;
  const order = ['EE', 'ME', 'AE', 'BE'];
  const ci = order.indexOf(current), pi = order.indexOf(prev);
  if (ci < pi) return <FiTrendingUp size={12} style={{ color: '#1D9E75' }} />;
  if (ci > pi) return <FiTrendingDown size={12} style={{ color: '#E24B4A' }} />;
  return <FiMinus size={12} className="text-gray-400" />;
}

export default function CBCCompetencyPage() {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [competencySummaries, setCompetencySummaries] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);

  const [selForm, setSelForm] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'matrix' | 'list'>('matrix');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [formsRes, streamsRes, subjectsRes, termsRes, studentsRes, compRes, assessRes] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
      supabase.from('cbc_competency_summaries').select('*'),
      supabase.from('cbc_assessments').select('*'),
    ]);
    const allForms = formsRes.data || [];
    const cbcForms = allForms.filter(f => getEducationSystem(f.id, allForms) === 'CBC_Senior_School');
    setForms(cbcForms);
    setStreams(streamsRes.data || []);
    setSubjects(subjectsRes.data || []);
    setTerms(termsRes.data || []);
    setStudents(studentsRes.data || []);
    setCompetencySummaries(compRes.data || []);
    setAssessments(assessRes.data || []);
    const cur = (termsRes.data || []).find((t: any) => t.is_current);
    if (cur) setSelTerm(String(cur.id));
    if (cbcForms.length > 0) setSelForm(String(cbcForms[0].id));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    let list = students;
    if (selForm) list = list.filter(s => String(s.form_id) === selForm);
    if (selStream) list = list.filter(s => String(s.stream_id) === selStream);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || (s.admission_no || '').toLowerCase().includes(q));
    }
    return list;
  }, [students, selForm, selStream, searchQuery]);

  // Get subjects that have competency data
  const activeSubjects = useMemo(() => {
    const subjectIds = new Set(competencySummaries.filter(c => !selTerm || String(c.term_id) === selTerm).map(c => c.subject_id));
    return subjects.filter(s => subjectIds.has(s.id));
  }, [subjects, competencySummaries, selTerm]);

  // Previous term for trend
  const prevTermId = useMemo(() => {
    const idx = terms.findIndex(t => String(t.id) === selTerm);
    return idx >= 0 && idx < terms.length - 1 ? terms[idx + 1].id : null;
  }, [terms, selTerm]);

  // Build competency matrix: student × subject
  const competencyMatrix = useMemo(() => {
    return filteredStudents.map(student => {
      const subjectLevels: Record<number, { current: string | null; prev: string | null; formative: string | null; summative: string | null; formativeCount: number }> = {};

      activeSubjects.forEach(sub => {
        const current = competencySummaries.find(c => c.student_id === student.id && c.subject_id === sub.id && (!selTerm || String(c.term_id) === selTerm));
        const prev = prevTermId ? competencySummaries.find(c => c.student_id === student.id && c.subject_id === sub.id && c.term_id === prevTermId) : null;

        subjectLevels[sub.id] = {
          current: current?.overall_level || null,
          prev: prev?.overall_level || null,
          formative: current?.formative_level || null,
          summative: current?.summative_level || null,
          formativeCount: current?.formative_count || 0,
        };
      });

      // Overall student competency
      const levels = Object.values(subjectLevels).map(sl => sl.current).filter(Boolean) as string[];
      const counts = { EE: 0, ME: 0, AE: 0, BE: 0 };
      levels.forEach(l => { if (counts[l as keyof typeof counts] !== undefined) (counts as any)[l]++; });
      let overallLevel: string | null = null;
      let maxC = 0;
      for (const [lvl, cnt] of Object.entries(counts)) {
        if (cnt > maxC) { maxC = cnt; overallLevel = lvl; }
      }

      return {
        student,
        subjectLevels,
        overallLevel: maxC > 0 ? overallLevel : null,
        assessedCount: levels.length,
        eeCount: counts.EE,
        meCount: counts.ME,
        aeCount: counts.AE,
        beCount: counts.BE,
      };
    });
  }, [filteredStudents, activeSubjects, competencySummaries, selTerm, prevTermId]);

  // Subject-level aggregate stats
  const subjectStats = useMemo(() => {
    return activeSubjects.map(sub => {
      let ee = 0, me = 0, ae = 0, be = 0;
      competencyMatrix.forEach(row => {
        const sl = row.subjectLevels[sub.id];
        if (sl?.current === 'EE') ee++;
        else if (sl?.current === 'ME') me++;
        else if (sl?.current === 'AE') ae++;
        else if (sl?.current === 'BE') be++;
      });
      const total = ee + me + ae + be;
      return { subjectId: sub.id, subjectName: sub.subject_name, ee, me, ae, be, total };
    });
  }, [activeSubjects, competencyMatrix]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
          <p className="text-gray-400 text-sm">Loading Competency Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <CBCNavBar activeTab="competency" breadcrumbEnd="Competency Tracking" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FiAward size={22} className="text-amber-500" />
              Competency Tracking Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Student × Subject competency matrix with formative/summative breakdown and term trends</p>
          </div>
          <div className="flex gap-2 items-end">
            <select value={selForm} onChange={e => setSelForm(e.target.value)} className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
              <option value="">All Forms</option>
              {forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selStream} onChange={e => setSelStream(e.target.value)} className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
              <option value="">All Streams</option>
              {streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
            <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
              {terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
            </select>
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search student..." className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs w-32" />
            <div className="flex bg-gray-100 rounded-md p-0.5">
              <button onClick={() => setViewMode('matrix')} className={`px-2 py-1 rounded text-[10px] font-semibold ${viewMode === 'matrix' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>Matrix</button>
              <button onClick={() => setViewMode('list')} className={`px-2 py-1 rounded text-[10px] font-semibold ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>List</button>
            </div>
          </div>
        </div>

        {/* Subject Stats Strip */}
        <div className="flex gap-3 overflow-x-auto pb-1">
          {subjectStats.map(ss => (
            <div key={ss.subjectId} className="flex-shrink-0 bg-white rounded-xl border border-gray-200 p-3 min-w-[160px]">
              <p className="text-xs font-bold text-gray-700 mb-2 truncate">{ss.subjectName}</p>
              <div className="flex h-2 rounded-full overflow-hidden mb-1.5">
                {ss.total > 0 && (
                  <>
                    <div style={{ width: `${(ss.ee / ss.total) * 100}%`, backgroundColor: RC.EE.bar }} />
                    <div style={{ width: `${(ss.me / ss.total) * 100}%`, backgroundColor: RC.ME.bar }} />
                    <div style={{ width: `${(ss.ae / ss.total) * 100}%`, backgroundColor: RC.AE.bar }} />
                    <div style={{ width: `${(ss.be / ss.total) * 100}%`, backgroundColor: RC.BE.bar }} />
                  </>
                )}
              </div>
              <div className="flex gap-2 text-[9px]">
                <span style={{ color: RC.EE.text }} className="font-semibold">{ss.ee} EE</span>
                <span style={{ color: RC.ME.text }} className="font-semibold">{ss.me} ME</span>
                <span style={{ color: RC.AE.text }} className="font-semibold">{ss.ae} AE</span>
                <span style={{ color: RC.BE.text }} className="font-semibold">{ss.be} BE</span>
              </div>
            </div>
          ))}
        </div>

        {/* Competency Matrix Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <FiTarget className="text-indigo-500" /> Competency Matrix — {filteredStudents.length} Students × {activeSubjects.length} Subjects
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase sticky left-0 bg-gray-50 z-20 w-8">#</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-gray-400 uppercase sticky left-8 bg-gray-50 z-20 min-w-[160px]">Student</th>
                  {activeSubjects.map(sub => (
                    <th key={sub.id} className="px-2 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase min-w-[70px]">
                      {sub.subject_name.length > 8 ? sub.subject_name.slice(0, 8) + '…' : sub.subject_name}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase">Overall</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-gray-400 uppercase">Trend</th>
                </tr>
              </thead>
              <tbody>
                {competencyMatrix.map((row, idx) => (
                  <tr key={row.student.id} className="border-b border-gray-100 hover:bg-gray-50/60">
                    <td className="px-3 py-2 text-gray-400 sticky left-0 bg-white z-10">{idx + 1}</td>
                    <td className="px-3 py-2 sticky left-8 bg-white z-10">
                      <div className="font-semibold text-gray-800">{row.student.first_name} {row.student.last_name}</div>
                      <div className="text-[10px] text-gray-400">{row.student.admission_no || row.student.admission_number}</div>
                    </td>
                    {activeSubjects.map(sub => {
                      const sl = row.subjectLevels[sub.id];
                      return (
                        <td key={sub.id} className="px-2 py-2 text-center">
                          <LevelBadge level={sl?.current || null} />
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-center">
                      <LevelBadge level={row.overallLevel} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {activeSubjects.length > 0 && (() => {
                        const firstSub = activeSubjects[0];
                        const sl = row.subjectLevels[firstSub.id];
                        return <TrendArrow current={sl?.current || null} prev={sl?.prev || null} />;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {competencyMatrix.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">No competency data found. Enter marks first.</div>
          )}
        </div>
      </div>
    </div>
  );
}

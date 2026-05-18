'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiUsers, FiArrowLeft, FiLock, FiBarChart2, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';

const LEVELS = ['EE', 'ME', 'AE', 'BE'] as const;

export default function TeacherEffectivenessPage() {
  const data = useCBCReportData();

  // Derive teacher performance from assessments
  const teacherStats = useMemo(() => {
    // Group assessments by teacher_id
    const teacherMap = new Map<number, { subjectIds: Set<number>; studentIds: Set<number>; levels: string[] }>();
    data.assessments.forEach(a => {
      if (!a.teacher_id || !a.rubric_level) return;
      if (!teacherMap.has(a.teacher_id)) teacherMap.set(a.teacher_id, { subjectIds: new Set(), studentIds: new Set(), levels: [] });
      const t = teacherMap.get(a.teacher_id)!;
      t.subjectIds.add(a.subject_id);
      t.studentIds.add(a.student_id);
      t.levels.push(a.rubric_level);
    });

    return Array.from(teacherMap.entries()).map(([teacherId, info]) => {
      const counts: Record<string, number> = { EE: 0, ME: 0, AE: 0, BE: 0 };
      let totalNum = 0;
      info.levels.forEach(l => { if (counts[l] !== undefined) { counts[l]++; totalNum += rubricNumeric(l); } });
      const total = info.levels.length;
      const avgNum = total > 0 ? totalNum / total : 0;
      const meanLevel = avgNum >= 3.5 ? 'EE' : avgNum >= 2.5 ? 'ME' : avgNum >= 1.5 ? 'AE' : total > 0 ? 'BE' : null;
      const meAbovePct = total > 0 ? Math.round(((counts.EE + counts.ME) / total) * 100) : 0;
      const bePct = total > 0 ? Math.round((counts.BE / total) * 100) : 0;

      // School mean for comparison
      const schoolLevels = data.assessments.filter(a => a.rubric_level).map(a => rubricNumeric(a.rubric_level));
      const schoolAvg = schoolLevels.length > 0 ? schoolLevels.reduce((a, b) => a + b, 0) / schoolLevels.length : 0;
      const vsSchool = avgNum - schoolAvg;

      const subjects = Array.from(info.subjectIds).map(id => data.getSubjectName(id)).join(', ');

      return {
        teacherId, name: data.getStaffName(teacherId), subjects,
        studentCount: info.studentIds.size, assessmentCount: total,
        counts, avgNum, meanLevel, meAbovePct, bePct, vsSchool,
      };
    }).sort((a, b) => b.avgNum - a.avgNum);
  }, [data.assessments, data.getStaffName, data.getSubjectName]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white"><FiUsers size={16} /></span>
              Teacher Effectiveness Report
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700 border border-red-200">Zeraki can&apos;t do this</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1"><FiLock size={9} />Admin Only</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Per teacher: % of class at EE/ME, subject mean vs school mean. Private to admin.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label>
            <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label>
            <select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label>
            <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
        </div>
      </div>

      {/* Teacher Cards */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto" /></div>
      ) : teacherStats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><FiUsers size={40} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">No teacher data</p></div>
      ) : (
        <div className="space-y-4">
          {teacherStats.map((teacher, idx) => {
            const c = getRubricColor(teacher.meanLevel);
            return (
              <div key={teacher.teacherId} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 px-5 py-4">
                  {/* Rank */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black ${idx === 0 ? 'bg-amber-400 text-white' : idx === 1 ? 'bg-gray-400 text-white' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {idx + 1}
                  </div>

                  {/* Teacher info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-800">{teacher.name}</h3>
                    <p className="text-[10px] text-gray-400">{teacher.subjects}</p>
                  </div>

                  {/* KPIs */}
                  <div className="flex gap-4 items-center">
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Students</p>
                      <p className="text-lg font-black text-gray-700">{teacher.studentCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">Mean</p>
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded text-xs font-bold" style={{ background: c.bg, color: c.text }}>{teacher.meanLevel || '—'}</span>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">ME+</p>
                      <p className={`text-lg font-black ${teacher.meAbovePct >= 70 ? 'text-green-600' : teacher.meAbovePct >= 50 ? 'text-blue-600' : 'text-red-600'}`}>{teacher.meAbovePct}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">BE%</p>
                      <p className={`text-lg font-black ${teacher.bePct <= 10 ? 'text-green-600' : teacher.bePct <= 25 ? 'text-amber-600' : 'text-red-600'}`}>{teacher.bePct}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-bold text-gray-400 uppercase">vs School</p>
                      <div className="flex items-center gap-1">
                        {teacher.vsSchool > 0 ? <FiTrendingUp size={14} className="text-green-500" /> : teacher.vsSchool < 0 ? <FiTrendingDown size={14} className="text-red-500" /> : null}
                        <span className={`text-sm font-bold ${teacher.vsSchool > 0 ? 'text-green-600' : teacher.vsSchool < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          {teacher.vsSchool > 0 ? '+' : ''}{teacher.vsSchool.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Distribution bar */}
                <div className="px-5 py-2 bg-gray-50/50 border-t border-gray-100">
                  <div className="flex h-4 rounded-full overflow-hidden">
                    {LEVELS.map(level => {
                      const cnt = teacher.counts[level] || 0;
                      const w = teacher.assessmentCount > 0 ? (cnt / teacher.assessmentCount) * 100 : 0;
                      if (w === 0) return null;
                      const rc = getRubricColor(level);
                      return <div key={level} style={{ width: `${w}%`, background: rc.bg }} className="flex items-center justify-center text-white text-[8px] font-bold" title={`${level}: ${cnt}`}>{w > 6 ? `${level} ${cnt}` : ''}</div>;
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

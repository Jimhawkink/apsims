'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData } from '@/hooks/useCBCReportData';
import { FiCheckCircle, FiArrowLeft, FiAlertCircle, FiClock } from 'react-icons/fi';

export default function MarksCompletionPage() {
  const data = useCBCReportData();

  const completionData = useMemo(() => {
    const subjectIds = [...new Set(data.studentSubjects.map((ss: any) => ss.subject_id))];
    return subjectIds.map(subjectId => {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (!subject) return null;
      const enrolled = data.studentSubjects.filter((ss: any) => ss.subject_id === subjectId).map((ss: any) => ss.student_id).filter((id: number) => data.filteredStudentIds.has(id));
      if (enrolled.length === 0) return null;
      const withOverall = data.summaries.filter(s => s.subject_id === subjectId && enrolled.includes(s.student_id) && s.overall_level);
      const pct = Math.round((withOverall.length / enrolled.length) * 100);
      const asmts = data.assessments.filter(a => a.subject_id === subjectId);
      const tIds = [...new Set(asmts.map(a => a.teacher_id).filter(Boolean))];
      const last = asmts.length > 0 ? new Date(Math.max(...asmts.map(a => new Date(a.assessed_at).getTime()))).toLocaleDateString() : null;
      return { subject, enrolled: enrolled.length, completed: withOverall.length, pct, teachers: tIds.map(id => data.getStaffName(id!)).join(', '), last };
    }).filter(Boolean).sort((a: any, b: any) => a.pct - b.pct);
  }, [data.subjects, data.studentSubjects, data.summaries, data.assessments, data.filteredStudentIds, data.getStaffName]);

  const overallPct = useMemo(() => {
    const t = completionData.reduce((a: number, c: any) => a + c.enrolled, 0);
    const d = completionData.reduce((a: number, c: any) => a + c.completed, 0);
    return t > 0 ? Math.round((d / t) * 100) : 0;
  }, [completionData]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div><h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-slate-700 flex items-center justify-center text-white"><FiCheckCircle size={16} /></span>Marks Entry Completion</h1>
          <p className="text-xs text-gray-500 mt-0.5">Which teachers have entered marks. % complete per subject per term.</p></div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="grid grid-cols-3 gap-3">
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
      </div></div>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3"><h2 className="text-sm font-bold text-gray-700">Overall — {data.currentTerm?.term_name}</h2><span className={`text-2xl font-black ${overallPct >= 90 ? 'text-green-600' : overallPct >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{overallPct}%</span></div>
        <div className="h-4 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${overallPct}%`, background: overallPct >= 90 ? '#15803d' : overallPct >= 60 ? '#b45309' : '#b91c1c' }} /></div>
      </div>
      {data.loadingData ? <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" /></div> :
        <div className="space-y-3">{completionData.map((item: any) => (
          <div key={item.subject.id} className="bg-white rounded-xl border border-gray-200 px-5 py-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">{item.pct >= 100 ? <FiCheckCircle className="text-green-500" size={16} /> : item.pct > 0 ? <FiClock className="text-amber-500" size={16} /> : <FiAlertCircle className="text-red-500" size={16} />}
                <div><h3 className="text-sm font-bold text-gray-800">{item.subject.subject_name}</h3><p className="text-[10px] text-gray-400">Teacher: {item.teachers || 'Unassigned'} · Last: {item.last || 'Never'}</p></div></div>
              <div className="text-right"><p className={`text-lg font-black ${item.pct >= 90 ? 'text-green-600' : item.pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{item.pct}%</p><p className="text-[10px] text-gray-400">{item.completed}/{item.enrolled}</p></div>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.pct >= 90 ? '#15803d' : item.pct >= 50 ? '#b45309' : '#b91c1c' }} /></div>
          </div>
        ))}</div>}
    </div>
  );
}

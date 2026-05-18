'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData } from '@/hooks/useCBCReportData';
import { FiClipboard, FiArrowLeft, FiCheckCircle, FiXCircle, FiAlertTriangle } from 'react-icons/fi';

export default function SBAAuditPage() {
  const data = useCBCReportData();

  // Analyze assessment completeness per teacher/subject
  const auditData = useMemo(() => {
    const subjectIds = [...new Set(data.assessments.map(a => a.subject_id))];
    const enrolledStudents = data.filteredStudents;
    const expectedMinFormative = 3; // minimum 3 formative tasks per subject per term

    return subjectIds.map(subjectId => {
      const subject = data.subjects.find(s => s.id === subjectId);
      if (!subject) return null;

      // Students enrolled in this subject
      const enrolledIds = data.studentSubjects.filter((ss: any) => ss.subject_id === subjectId).map((ss: any) => ss.student_id);
      const enrolled = enrolledStudents.filter(s => enrolledIds.includes(s.id));
      if (enrolled.length === 0) return null;

      // Assessments for this subject
      const subAssessments = data.assessments.filter(a => a.subject_id === subjectId);
      const formativeAssessments = subAssessments.filter(a => a.assessment_type === 'formative');
      const summativeAssessments = subAssessments.filter(a => a.assessment_type === 'summative');

      // Unique formative task names
      const formativeTaskNames = [...new Set(formativeAssessments.map(a => a.task_name))];
      const summativeTaskNames = [...new Set(summativeAssessments.map(a => a.task_name))];

      // Per-student completion
      const studentCompletion = enrolled.map(student => {
        const studentFormatives = formativeAssessments.filter(a => a.student_id === student.id);
        const studentSummatives = summativeAssessments.filter(a => a.student_id === student.id);
        return {
          studentId: student.id,
          formativeCount: studentFormatives.length,
          summativeCount: studentSummatives.length,
          complete: studentFormatives.length >= expectedMinFormative && studentSummatives.length >= 1,
        };
      });

      const completeCount = studentCompletion.filter(sc => sc.complete).length;
      const completePct = Math.round((completeCount / enrolled.length) * 100);
      const missingFormative = enrolled.length - studentCompletion.filter(sc => sc.formativeCount >= expectedMinFormative).length;
      const missingSummative = enrolled.length - studentCompletion.filter(sc => sc.summativeCount >= 1).length;

      // Teacher
      const teacherIds = [...new Set(subAssessments.map(a => a.teacher_id).filter(Boolean))];
      const teacherNames = teacherIds.map(id => data.getStaffName(id!)).join(', ');

      const status = completePct === 100 ? 'complete' : completePct >= 70 ? 'partial' : completePct > 0 ? 'behind' : 'not_started';

      return {
        subject, enrolled: enrolled.length, formativeTaskNames, summativeTaskNames,
        completeCount, completePct, missingFormative, missingSummative,
        teacherNames, status, formativeCount: formativeTaskNames.length, summativeCount: summativeTaskNames.length,
      };
    }).filter(Boolean).sort((a: any, b: any) => a.completePct - b.completePct);
  }, [data.assessments, data.filteredStudents, data.subjects, data.studentSubjects, data.getStaffName]);

  const overallStats = useMemo(() => {
    const complete = auditData.filter((a: any) => a.status === 'complete').length;
    const partial = auditData.filter((a: any) => a.status === 'partial').length;
    const behind = auditData.filter((a: any) => a.status === 'behind').length;
    const notStarted = auditData.filter((a: any) => a.status === 'not_started').length;
    return { complete, partial, behind, notStarted, total: auditData.length };
  }, [auditData]);

  const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; icon: any }> = {
    complete: { label: 'Complete', bg: '#DCFCE7', text: '#15803D', icon: FiCheckCircle },
    partial: { label: 'In Progress', bg: '#DBEAFE', text: '#1D4ED8', icon: FiAlertTriangle },
    behind: { label: 'Behind', bg: '#FEF3C7', text: '#92400E', icon: FiAlertTriangle },
    not_started: { label: 'Not Started', bg: '#FEE2E2', text: '#991B1B', icon: FiXCircle },
  };

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center text-white"><FiClipboard size={16} /></span>
            SBA Completeness Audit
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">New ground</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Audit of formative/summative assessment completion by teacher and subject. KNEC compliance check.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
        </div>
      </div>

      {/* Status KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="rounded-xl border p-4" style={{ background: cfg.bg, borderColor: cfg.text + '33' }}>
            <div className="flex items-center gap-1.5 mb-1"><cfg.icon size={12} style={{ color: cfg.text }} /><p className="text-[10px] font-bold uppercase" style={{ color: cfg.text }}>{cfg.label}</p></div>
            <p className="text-2xl font-black" style={{ color: cfg.text }}>{(overallStats as any)[key] || 0}</p>
          </div>
        ))}
      </div>

      {/* Subject Audit Cards */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-gray-500 rounded-full animate-spin mx-auto" /></div>
      ) : auditData.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><FiClipboard size={40} className="mx-auto mb-3 text-gray-300" /><p className="font-semibold">No assessment data for audit</p></div>
      ) : (
        <div className="space-y-3">
          {auditData.map((audit: any) => {
            const statusCfg = STATUS_CONFIG[audit.status] || STATUS_CONFIG.not_started;
            const StatusIcon = statusCfg.icon;
            return (
              <div key={audit.subject.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center" style={{ background: statusCfg.bg }}>
                    <StatusIcon size={16} style={{ color: statusCfg.text }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="text-sm font-bold text-gray-800">{audit.subject.subject_name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ background: statusCfg.bg, color: statusCfg.text }}>{statusCfg.label}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Teacher: {audit.teacherNames || 'Unassigned'} · {audit.enrolled} students enrolled</p>
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-center"><p className="text-[9px] text-gray-400 uppercase font-bold">Formative Tasks</p><p className="text-lg font-black text-blue-600">{audit.formativeCount}<span className="text-[10px] text-gray-400 font-normal">/3 min</span></p></div>
                    <div className="text-center"><p className="text-[9px] text-gray-400 uppercase font-bold">Summative</p><p className="text-lg font-black text-purple-600">{audit.summativeCount}<span className="text-[10px] text-gray-400 font-normal">/1 min</span></p></div>
                    <div className="text-center"><p className="text-[9px] text-gray-400 uppercase font-bold">Completion</p><p className={`text-lg font-black ${audit.completePct >= 80 ? 'text-green-600' : audit.completePct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{audit.completePct}%</p></div>
                  </div>
                </div>
                {/* Completion bar */}
                <div className="px-5 py-2 bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${audit.completePct}%`, background: audit.completePct >= 80 ? '#15803d' : audit.completePct >= 50 ? '#b45309' : '#b91c1c' }} /></div>
                    <span className="text-[10px] text-gray-500">{audit.completeCount}/{audit.enrolled} students fully assessed</span>
                    {audit.missingFormative > 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">⚠ {audit.missingFormative} missing formative</span>}
                    {audit.missingSummative > 0 && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">⚠ {audit.missingSummative} missing summative</span>}
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

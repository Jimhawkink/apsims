'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiHeart, FiArrowLeft, FiDownload, FiCheckCircle, FiClock, FiXCircle } from 'react-icons/fi';

function RubricBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-gray-300 text-[10px]">—</span>;
  const c = getRubricColor(level);
  return <span style={{ background: c.bg, color: c.text }} className="inline-flex items-center justify-center font-bold rounded text-[10px] px-1.5 py-0.5">{level}</span>;
}

export default function InterventionTrackerPage() {
  const data = useCBCReportData();

  const interventionData = useMemo(() => {
    return data.interventions.map(flag => {
      const student = data.getStudentObj(flag.student_id);
      if (!student) return null;
      const currentSum = data.filteredSummaries.find(s => s.student_id === flag.student_id && s.subject_id === flag.subject_id);
      const currentLevel = currentSum?.overall_level || null;
      const originalLevel = flag.rubric_level_at_flag || 'BE';
      const improved = currentLevel && rubricNumeric(currentLevel) > rubricNumeric(originalLevel);
      const resolvedDate = flag.resolved_at ? new Date(flag.resolved_at).toLocaleDateString() : null;
      return { ...flag, student, currentLevel, originalLevel, improved, resolvedDate, subjectName: data.getSubjectName(flag.subject_id), teacherName: data.getStaffName(flag.assigned_teacher_id) };
    }).filter(Boolean).sort((a: any, b: any) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return 0;
    });
  }, [data.interventions, data.filteredSummaries, data.getStudentObj, data.getSubjectName, data.getStaffName]);

  const stats = useMemo(() => {
    const active = interventionData.filter((i: any) => i.status === 'active').length;
    const resolved = interventionData.filter((i: any) => i.status === 'resolved').length;
    const improved = interventionData.filter((i: any) => i.improved).length;
    const successRate = interventionData.length > 0 ? Math.round((improved / interventionData.length) * 100) : 0;
    return { active, resolved, improved, total: interventionData.length, successRate };
  }, [interventionData]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white"><FiHeart size={16} /></span>
            Intervention Outcomes Tracker
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">New ground</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Tracks every BE-flagged student through intervention. Evidence-based outcomes for KNEC audit.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4"><p className="text-[10px] font-bold text-gray-400 uppercase">Total Flags</p><p className="text-2xl font-black text-gray-800">{stats.total}</p></div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4"><p className="text-[10px] font-bold text-amber-600 uppercase">Active</p><p className="text-2xl font-black text-amber-700">{stats.active}</p></div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4"><p className="text-[10px] font-bold text-green-600 uppercase">Resolved</p><p className="text-2xl font-black text-green-700">{stats.resolved}</p></div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4"><p className="text-[10px] font-bold text-blue-600 uppercase">Improved</p><p className="text-2xl font-black text-blue-700">{stats.improved}</p></div>
        <div className="rounded-xl border p-4" style={{ background: stats.successRate >= 60 ? '#DCFCE7' : stats.successRate >= 30 ? '#FEF3C7' : '#FEE2E2', borderColor: stats.successRate >= 60 ? '#86EFAC' : stats.successRate >= 30 ? '#FCD34D' : '#FCA5A5' }}>
          <p className="text-[10px] font-bold uppercase" style={{ color: stats.successRate >= 60 ? '#15803D' : stats.successRate >= 30 ? '#92400E' : '#991B1B' }}>Success Rate</p>
          <p className="text-2xl font-black" style={{ color: stats.successRate >= 60 ? '#15803D' : stats.successRate >= 30 ? '#92400E' : '#991B1B' }}>{stats.successRate}%</p>
        </div>
      </div>

      {/* Intervention List */}
      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto" /></div>
      ) : interventionData.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-gray-400"><FiHeart size={40} className="mx-auto mb-3 text-green-400" /><p className="font-semibold text-green-600">No intervention flags recorded</p><p className="text-sm mt-1">Flags are created when students receive BE levels</p></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gradient-to-r from-red-50 to-pink-50 border-b-2 border-gray-200">
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase w-14">Status</th>
                <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Student</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Subject</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">At Flag</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Current</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Progress</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Type</th>
                <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Assigned To</th>
                <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Outcome</th>
              </tr></thead>
              <tbody>
                {interventionData.map((int: any, i: number) => (
                  <tr key={int.id} className={`border-b border-gray-100 ${int.status === 'active' ? 'bg-amber-50/30' : i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-3 py-2.5 text-center">
                      {int.status === 'active' ? <FiClock size={14} className="mx-auto text-amber-500" /> : int.status === 'resolved' ? <FiCheckCircle size={14} className="mx-auto text-green-500" /> : <FiXCircle size={14} className="mx-auto text-red-500" />}
                    </td>
                    <td className="px-3 py-2.5"><div className="font-semibold text-gray-800">{int.student.first_name} {int.student.last_name}</div><div className="text-[10px] text-gray-400 font-mono">{int.student.admission_no || int.student.admission_number}</div></td>
                    <td className="px-3 py-2.5 text-center font-medium text-gray-700">{int.subjectName}</td>
                    <td className="px-3 py-2.5 text-center"><RubricBadge level={int.originalLevel} /></td>
                    <td className="px-3 py-2.5 text-center"><RubricBadge level={int.currentLevel} /></td>
                    <td className="px-3 py-2.5 text-center">
                      {int.improved ? <span className="text-[10px] px-2 py-0.5 rounded bg-green-100 text-green-700 font-bold">✅ Improved</span> :
                       int.currentLevel ? <span className="text-[10px] px-2 py-0.5 rounded bg-red-100 text-red-700 font-bold">No Change</span> :
                       <span className="text-[10px] text-gray-400">Pending</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center"><span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">{int.intervention_type || '—'}</span></td>
                    <td className="px-3 py-2.5 text-[10px] text-gray-600">{int.teacherName}</td>
                    <td className="px-3 py-2.5 text-center text-[10px] text-gray-500">{int.outcome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

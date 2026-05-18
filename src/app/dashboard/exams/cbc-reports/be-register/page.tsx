'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor } from '@/hooks/useCBCReportData';
import { FiFlag, FiArrowLeft, FiDownload, FiPrinter } from 'react-icons/fi';

export default function BERegisterPage() {
  const data = useCBCReportData();

  const beStudents = useMemo(() => {
    const results: any[] = [];
    data.filteredStudents.forEach(student => {
      const sums = data.filteredSummaries.filter(s => s.student_id === student.id && s.overall_level === 'BE');
      if (sums.length === 0) return;
      const subjects = sums.map(s => data.getSubjectName(s.subject_id));
      const intervention = data.interventions.find(i => i.student_id === student.id);
      results.push({ student, beSubjects: subjects, beCount: sums.length, intervention });
    });
    return results.sort((a, b) => b.beCount - a.beCount);
  }, [data.filteredStudents, data.filteredSummaries, data.interventions, data.getSubjectName]);

  const exportCSV = () => {
    const headers = ['Adm No', 'Name', 'Gender', 'Stream', 'BE Subjects', 'BE Count', 'Intervention Status', 'Assigned Teacher'];
    const rows = beStudents.map(r => [
      r.student.admission_no || r.student.admission_number, `${r.student.first_name} ${r.student.last_name}`,
      r.student.gender, data.getStreamName(r.student.stream_id), r.beSubjects.join('; '), r.beCount,
      r.intervention?.status || 'None', r.intervention ? data.getStaffName(r.intervention.assigned_teacher_id) : '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `be-register-${data.currentTerm?.term_name || ''}.csv`; a.click();
  };

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
          <div><h1 className="text-xl font-bold text-gray-800 flex items-center gap-2"><span className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white"><FiFlag size={16} /></span>BE Intervention Register</h1>
            <p className="text-xs text-gray-500 mt-0.5">All students with BE levels. Printable HOD register with intervention tracking.</p></div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg"><FiPrinter size={13} /> Print</button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white rounded-lg bg-red-500"><FiDownload size={13} /> Export</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-4"><div className="grid grid-cols-3 gap-3">
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
        <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
      </div></div>
      <div className="bg-red-50 rounded-xl border border-red-200 p-4 flex items-center justify-between">
        <div><p className="text-[10px] font-bold text-red-600 uppercase">Total BE Students</p><p className="text-3xl font-black text-red-700">{beStudents.length}</p></div>
        <div><p className="text-[10px] font-bold text-red-600 uppercase">Total BE Instances</p><p className="text-3xl font-black text-red-700">{beStudents.reduce((a, b) => a + b.beCount, 0)}</p></div>
      </div>
      {data.loadingData ? <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto" /></div> :
      beStudents.length === 0 ? <div className="bg-white rounded-xl border border-gray-200 text-center py-20 text-green-500"><p className="font-semibold text-lg">No BE students! 🎉</p></div> :
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-xs">
        <thead><tr className="bg-red-50 border-b-2 border-gray-200">
          <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase w-10">#</th>
          <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase w-20">Adm</th>
          <th className="px-3 py-3 text-left font-bold text-gray-500 uppercase">Name</th>
          <th className="px-2 py-3 text-center font-bold text-gray-400 uppercase w-10">G</th>
          <th className="px-2 py-3 text-center font-bold text-gray-400 uppercase">Stream</th>
          <th className="px-3 py-3 text-left font-bold text-red-600 uppercase">BE Subjects</th>
          <th className="px-2 py-3 text-center font-bold text-red-600 uppercase w-10">Count</th>
          <th className="px-3 py-3 text-center font-bold text-gray-500 uppercase">Status</th>
        </tr></thead>
        <tbody>{beStudents.map((row, i) => (
          <tr key={row.student.id} className={`border-b border-gray-100 ${i % 2 ? 'bg-gray-50/30' : ''}`}>
            <td className="px-3 py-2.5 text-center text-gray-500 font-bold">{i + 1}</td>
            <td className="px-3 py-2.5 font-mono text-blue-600 text-[10px] font-bold">{row.student.admission_no || row.student.admission_number}</td>
            <td className="px-3 py-2.5 font-semibold text-gray-800">{row.student.first_name} {row.student.last_name}</td>
            <td className="px-2 py-2.5 text-center text-[10px] text-gray-400">{(row.student.gender === 'Male' || row.student.gender === 'M') ? 'M' : 'F'}</td>
            <td className="px-2 py-2.5 text-center text-[10px] text-gray-500">{data.getStreamName(row.student.stream_id)}</td>
            <td className="px-3 py-2.5"><div className="flex flex-wrap gap-1">{row.beSubjects.map((s: string, j: number) => <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-semibold border border-red-200">{s}</span>)}</div></td>
            <td className="px-2 py-2.5 text-center"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold">{row.beCount}</span></td>
            <td className="px-3 py-2.5 text-center"><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${row.intervention?.status === 'active' ? 'bg-amber-100 text-amber-700' : row.intervention?.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{row.intervention?.status || 'Not flagged'}</span></td>
          </tr>
        ))}</tbody>
      </table></div></div>}
    </div>
  );
}

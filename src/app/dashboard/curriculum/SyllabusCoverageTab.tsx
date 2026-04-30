'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiBarChart2, FiTrendingUp, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';
import UltraGrid, { StatusBadge, STATUS_MAPS } from './UltraGrid';

export default function SyllabusCoverageTab({ d }: any) {
  const coverageStatus = (r: any) => {
    if (r.coverage_percent >= 100) return 'Complete';
    if (!r.is_on_track) return r.coverage_percent < 50 ? 'Critical' : 'Behind';
    return 'On Track';
  };

  const cols = [
    { key: 'subject_id', label: 'Subject', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{d.getSubjectName(v)}</span> },
    { key: 'form_id', label: 'Form', color: '#065f46', bg: '#ecfdf5', render: (v: any) => d.getFormName(v) },
    { key: 'term_id', label: 'Term', color: '#92400e', bg: '#fffbeb', render: (v: any) => d.getTermName(v) },
    { key: 'teacher_id', label: 'Teacher', color: '#5b21b6', bg: '#f5f3ff', render: (v: any) => d.getTeacherName(v) },
    { key: 'total_topics', label: 'Total', color: '#155e75', bg: '#ecfeff' },
    { key: 'covered_topics', label: 'Covered', color: '#166534', bg: '#f0fdf4' },
    { key: 'coverage_percent', label: 'Coverage %', color: '#15803d', bg: '#f0fdf4', render: (v: any, r: any) => {
      const pct = Number(v) || 0;
      const color = pct >= 80 ? '#15803d' : pct >= 50 ? '#b45309' : '#b91c1c';
      return <div className="flex items-center gap-2">
        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} /></div>
        <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
      </div>;
    }},
    { key: 'is_on_track', label: 'Status', color: '#991b1b', bg: '#fef2f2', render: (_: any, r: any) => <StatusBadge status={coverageStatus(r)} map={STATUS_MAPS.coverage} /> },
    { key: 'predicted_completion_date', label: 'Predicted', color: '#6b21a8', bg: '#faf5ff', render: (v: any) => v ? new Date(v).toLocaleDateString() : <span className="text-gray-400">—</span> },
  ];

  const stats = d.syllabusCoverage.reduce((acc: any, r: any) => {
    const s = coverageStatus(r);
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});

  // Calculate teaching load per teacher
  const teacherLoad: Record<number, { name: string; subjects: Set<string>; forms: Set<string>; coverage: any[] }> = {};
  d.syllabusCoverage.forEach((r: any) => {
    if (!r.teacher_id) return;
    if (!teacherLoad[r.teacher_id]) teacherLoad[r.teacher_id] = { name: d.getTeacherName(r.teacher_id), subjects: new Set(), forms: new Set(), coverage: [] };
    teacherLoad[r.teacher_id].subjects.add(d.getSubjectName(r.subject_id));
    teacherLoad[r.teacher_id].forms.add(d.getFormName(r.form_id));
    teacherLoad[r.teacher_id].coverage.push(r);
  });

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{stats['On Track'] || 0}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">On Track</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{stats['Behind'] || 0}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Behind</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{stats['Critical'] || 0}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Critical</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats['Complete'] || 0}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Complete</p>
        </div>
      </div>

      {/* Coverage Grid */}
      <UltraGrid columns={cols} data={d.syllabusCoverage} emptyMessage="No syllabus coverage data — add subjects and terms first" rowColor={(r: any) => {
        const s = coverageStatus(r);
        if (s === 'Critical') return 'bg-red-50/60';
        if (s === 'Behind') return 'bg-amber-50/60';
        return '';
      }} />

      {/* Teaching Load Report */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3"><FiBarChart2 className="text-purple-500" /> Teaching Load Report</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.values(teacherLoad).map((t: any, i: number) => {
            const avgCoverage = t.coverage.length > 0 ? t.coverage.reduce((s: number, c: any) => s + Number(c.coverage_percent || 0), 0) / t.coverage.length : 0;
            const color = avgCoverage >= 80 ? '#15803d' : avgCoverage >= 50 ? '#b45309' : '#b91c1c';
            return (
              <div key={i} className="border border-gray-200 rounded-xl p-3 hover:shadow-md transition-all">
                <p className="text-xs font-bold text-gray-800">{t.name}</p>
                <p className="text-[10px] text-gray-500 mt-1">{t.subjects.size} subject(s) · {t.forms.size} form(s)</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${avgCoverage}%`, backgroundColor: color }} /></div>
                  <span className="text-[10px] font-bold" style={{ color }}>{avgCoverage.toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

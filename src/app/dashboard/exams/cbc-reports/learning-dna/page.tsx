'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCBCReportData, getRubricColor, rubricNumeric } from '@/hooks/useCBCReportData';
import { FiActivity, FiArrowLeft, FiSearch } from 'react-icons/fi';

// Simple radar chart using SVG
function RadarChart({ data, size = 200 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const n = data.length;
  if (n < 3) return null;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i: number, val: number) => {
    const angle = angleStep * i - Math.PI / 2;
    const dist = (val / 4) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };

  const polygonPoints = data.map((d, i) => { const p = getPoint(i, d.value); return `${p.x},${p.y}`; }).join(' ');
  const gridLevels = [1, 2, 3, 4];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = Array.from({ length: n }, (_, i) => { const p = getPoint(i, level); return `${p.x},${p.y}`; }).join(' ');
        return <polygon key={level} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="0.5" />;
      })}
      {/* Axes */}
      {data.map((_, i) => { const p = getPoint(i, 4); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth="0.5" />; })}
      {/* Data polygon */}
      <polygon points={polygonPoints} fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" strokeWidth="2" />
      {/* Data points */}
      {data.map((d, i) => { const p = getPoint(i, d.value); return <circle key={i} cx={p.x} cy={p.y} r="4" fill={d.color} stroke="white" strokeWidth="1.5" />; })}
      {/* Labels */}
      {data.map((d, i) => {
        const p = getPoint(i, 4.8);
        return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="600" fill="#6b7280">{d.label}</text>;
      })}
    </svg>
  );
}

export default function LearningDNAPage() {
  const data = useCBCReportData();
  const [searchQ, setSearchQ] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

  const dnaProfiles = useMemo(() => {
    return data.filteredStudents.map(student => {
      const sums = data.filteredSummaries.filter(s => s.student_id === student.id && s.overall_level);
      if (sums.length === 0) return null;

      const subjectData = sums.map(s => {
        const sub = data.subjects.find(sub => sub.id === s.subject_id);
        const c = getRubricColor(s.overall_level);
        return { subjectId: s.subject_id, label: sub?.subject_code || sub?.subject_name?.substring(0, 5) || '?', value: rubricNumeric(s.overall_level!), color: c.bg, level: s.overall_level!, fullName: sub?.subject_name || '?' };
      });

      const avgNum = subjectData.reduce((a, s) => a + s.value, 0) / subjectData.length;
      const overallLevel = avgNum >= 3.5 ? 'EE' : avgNum >= 2.5 ? 'ME' : avgNum >= 1.5 ? 'AE' : 'BE';
      const strongest = subjectData.sort((a, b) => b.value - a.value)[0];
      const weakest = [...subjectData].sort((a, b) => a.value - b.value)[0];
      const balance = Math.max(...subjectData.map(s => s.value)) - Math.min(...subjectData.map(s => s.value));
      const profileType = balance <= 1 ? 'Balanced' : balance <= 2 ? 'Moderate Spread' : 'Specialized';

      return { student, subjectData, avgNum, overallLevel, strongest, weakest, balance, profileType };
    }).filter(Boolean).sort((a: any, b: any) => b.avgNum - a.avgNum);
  }, [data.filteredStudents, data.filteredSummaries, data.subjects]);

  const filtered = useMemo(() => {
    if (!searchQ.trim()) return dnaProfiles;
    const q = searchQ.toLowerCase();
    return dnaProfiles.filter((p: any) => `${p.student.first_name} ${p.student.last_name}`.toLowerCase().includes(q));
  }, [dnaProfiles, searchQ]);

  if (data.loading) return <div className="flex items-center justify-center h-[60vh]"><div className="w-10 h-10 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/exams/cbc-reports" className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-500"><FiArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white"><FiActivity size={16} /></span>
            Student Learning DNA Profile
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700 border border-green-200">New ground</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Radar chart per student showing unique competency fingerprint across all subjects</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Form</label><select value={data.selForm} onChange={e => data.setSelForm(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Stream</label><select value={data.selStream} onChange={e => data.setSelStream(e.target.value)} className="select-modern w-full text-sm"><option value="">All</option>{data.streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Term</label><select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)} className="select-modern w-full text-sm">{data.terms.map(t => <option key={t.id} value={t.id}>{t.term_name}{t.is_current ? ' ●' : ''}</option>)}</select></div>
          <div><label className="block text-[10px] font-semibold text-gray-500 mb-1">Search</label>
            <div className="relative"><FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" placeholder="Name..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full outline-none focus:ring-2 focus:ring-purple-100" /></div></div>
        </div>
      </div>

      {data.loadingData ? (
        <div className="bg-white rounded-xl border text-center py-20"><div className="w-8 h-8 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin mx-auto" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((profile: any) => {
            const c = getRubricColor(profile.overallLevel);
            return (
              <div key={profile.student.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                onClick={() => setSelectedStudent(selectedStudent === profile.student.id ? null : profile.student.id)}>
                {/* Student header */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800">{profile.student.first_name} {profile.student.last_name}</h3>
                    <p className="text-[10px] text-gray-400 font-mono">{profile.student.admission_no || profile.student.admission_number}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: c.bg, color: c.text }}>{profile.overallLevel}</span>
                </div>

                {/* Radar Chart */}
                <div className="flex justify-center py-3 bg-gray-50/50">
                  <RadarChart data={profile.subjectData} size={180} />
                </div>

                {/* Profile info */}
                <div className="px-4 py-3 space-y-1.5">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Profile Type</span>
                    <span className={`font-bold ${profile.profileType === 'Balanced' ? 'text-green-600' : profile.profileType === 'Specialized' ? 'text-purple-600' : 'text-blue-600'}`}>{profile.profileType}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Strongest</span>
                    <span className="font-bold text-green-600">{profile.strongest?.fullName} ({profile.strongest?.level})</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-400">Needs Growth</span>
                    <span className="font-bold text-red-600">{profile.weakest?.fullName} ({profile.weakest?.level})</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {selectedStudent === profile.student.id && (
                  <div className="px-4 py-3 bg-indigo-50 border-t border-indigo-100 space-y-1">
                    <p className="text-[10px] font-bold text-indigo-700 uppercase">Subject Breakdown</p>
                    {profile.subjectData.map((sd: any) => (
                      <div key={sd.subjectId} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-24 truncate">{sd.fullName}</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${(sd.value / 4) * 100}%`, background: sd.color }} />
                        </div>
                        <span className="text-[10px] font-bold w-6 text-right" style={{ color: sd.color }}>{sd.level}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

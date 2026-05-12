'use client';

import { useCBCSummaryData } from '@/hooks/useCBCSummaryData';
import CBCNavBar from '@/components/cbc/CBCNavBar';
import {
  FiPieChart, FiBarChart2, FiTrendingUp, FiTrendingDown, FiMinus,
  FiUsers, FiAlertTriangle, FiAward, FiTarget, FiActivity,
  FiCheckCircle, FiDownload, FiFlag, FiStar, FiArrowRight,
} from 'react-icons/fi';

// ── Rubric color constants ──
const RC = {
  EE: { bar: '#1D9E75', text: '#0F6E56', bg: '#E1F5EE', light: '#d1fae5' },
  ME: { bar: '#378ADD', text: '#185FA5', bg: '#E6F1FB', light: '#dbeafe' },
  AE: { bar: '#EF9F27', text: '#854F0B', bg: '#FAEEDA', light: '#fef3c7' },
  BE: { bar: '#E24B4A', text: '#A32D2D', bg: '#FCEBEB', light: '#fee2e2' },
};

function LevelBadge({ level, size = 'sm' }: { level: string | null; size?: 'sm' | 'md' }) {
  if (!level) return <span className="text-[10px] text-gray-400">—</span>;
  const c = RC[level as keyof typeof RC] || { bg: '#f3f4f6', text: '#666' };
  return (
    <span
      className={`inline-flex items-center rounded font-bold ${size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'}`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {level}
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub, gradient }: {
  icon: any; label: string; value: string | number; sub?: string; gradient: string;
}) {
  return (
    <div className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden" style={{ background: gradient }}>
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6" style={{ background: 'white' }} />
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-semibold uppercase opacity-80 tracking-wider">{label}</p>
        <Icon size={18} className="opacity-60" />
      </div>
      <p className="text-3xl font-extrabold">{value}</p>
      {sub && <p className="text-[11px] opacity-70 mt-1">{sub}</p>}
    </div>
  );
}

function DistributionBar({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-7 text-xs font-bold" style={{ color }}>{label}</span>
      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: count > 0 ? '6px' : '0' }}
        />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-gray-600">{count}</span>
      <span className="w-10 text-right text-[11px] text-gray-400">{pct}%</span>
    </div>
  );
}

export default function CBCSummaryPage() {
  const data = useCBCSummaryData();

  if (data.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
          <p className="text-gray-400 text-sm">Loading Summary Analytics...</p>
        </div>
      </div>
    );
  }

  const dist = data.overallDistribution;

  return (
    <div className="animate-fade-in">
      <CBCNavBar activeTab="summary" breadcrumbEnd="Summary Analytics" />

      <div className="p-6 space-y-6">
        {/* ── Page Header + Filters ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FiBarChart2 size={22} className="text-indigo-500" />
              CBC Summary Analytics
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Comprehensive rubric distribution, subject analysis, and performance trends
            </p>
          </div>
          <div className="flex gap-2 items-end">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Form</label>
              <select value={data.selForm} onChange={e => data.setSelForm(e.target.value)}
                className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
                <option value="">All Forms</option>
                {data.forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold text-gray-400 uppercase">Term</label>
              <select value={data.selTerm} onChange={e => data.setSelTerm(e.target.value)}
                className="py-1.5 px-2 rounded-md border border-gray-200 bg-gray-50 text-xs">
                <option value="">All Terms</option>
                {data.terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50">
              <FiDownload size={13} /> Export Report
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={FiUsers} label="Total Assessments" value={data.totalAssessments} sub={`${data.formStudents.length} students`} gradient="linear-gradient(135deg, #6C63FF, #5a52e0)" />
          <StatCard icon={FiTarget} label="Mean Score" value={data.overallMeanScore !== null ? `${data.overallMeanScore}%` : '—'} sub="Across all subjects" gradient="linear-gradient(135deg, #00D9A6, #00c496)" />
          <StatCard icon={FiAward} label="EE Rate" value={dist.total > 0 ? `${Math.round((dist.EE / dist.total) * 100)}%` : '—'} sub={`${dist.EE} exceeding expectation`} gradient="linear-gradient(135deg, #1D9E75, #15803d)" />
          <StatCard icon={FiAlertTriangle} label="BE Interventions" value={data.interventionStats.open} sub={`${data.interventionStats.resolved} resolved`} gradient="linear-gradient(135deg, #E24B4A, #dc2626)" />
        </div>

        {/* ── Row: Distribution + Intervention Summary ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Rubric Distribution */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FiPieChart className="text-indigo-500" /> Overall Rubric Distribution
              </h3>
              <span className="text-[11px] text-gray-400">{dist.total} assessments</span>
            </div>
            <div className="p-5 space-y-3">
              <DistributionBar label="EE" count={dist.EE} total={dist.total} color={RC.EE.bar} />
              <DistributionBar label="ME" count={dist.ME} total={dist.total} color={RC.ME.bar} />
              <DistributionBar label="AE" count={dist.AE} total={dist.total} color={RC.AE.bar} />
              <DistributionBar label="BE" count={dist.BE} total={dist.total} color={RC.BE.bar} />
              {/* Visual chart bars */}
              <div className="flex items-end gap-2 h-20 mt-4 pt-4 border-t border-gray-100">
                {[
                  { label: 'EE', count: dist.EE, color: RC.EE.bar },
                  { label: 'ME', count: dist.ME, color: RC.ME.bar },
                  { label: 'AE', count: dist.AE, color: RC.AE.bar },
                  { label: 'BE', count: dist.BE, color: RC.BE.bar },
                ].map((item) => {
                  const maxCount = Math.max(dist.EE, dist.ME, dist.AE, dist.BE, 1);
                  const height = Math.max(8, (item.count / maxCount) * 100);
                  return (
                    <div key={item.label} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold text-gray-600">{item.count}</span>
                      <div className="w-full rounded-t-lg transition-all duration-700" style={{ height: `${height}%`, backgroundColor: item.color, minHeight: '4px' }} />
                      <span className="text-[10px] font-semibold" style={{ color: item.color }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Intervention Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FiFlag className="text-red-500" /> Intervention Tracker
              </h3>
            </div>
            <div className="p-5 space-y-3">
              {[
                { label: 'Open Cases', count: data.interventionStats.open, color: '#E24B4A', bg: '#FCEBEB' },
                { label: 'In Progress', count: data.interventionStats.inProgress, color: '#EF9F27', bg: '#FAEEDA' },
                { label: 'Resolved', count: data.interventionStats.resolved, color: '#1D9E75', bg: '#E1F5EE' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-3 rounded-xl" style={{ backgroundColor: item.bg }}>
                  <span className="text-xs font-semibold" style={{ color: item.color }}>{item.label}</span>
                  <span className="text-lg font-bold" style={{ color: item.color }}>{item.count}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[11px] text-gray-500 mb-2 font-semibold">At-Risk Students</p>
                {data.atRiskStudents.slice(0, 5).map((s, i) => (
                  <div key={s.studentId} className="flex items-center justify-between py-1.5 text-xs">
                    <span className="text-gray-700 font-medium">{i + 1}. {s.name}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: '#FCEBEB', color: '#A32D2D' }}>
                      {s.beCount} BE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Subject Analysis Table ── */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <FiActivity className="text-purple-500" /> Subject-by-Subject Analysis
            </h3>
            <span className="text-[11px] text-gray-400">{data.subjectAnalysis.length} subjects</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Subject</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase">Mean Score</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase" style={{ color: RC.EE.text }}>EE</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase" style={{ color: RC.ME.text }}>ME</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase" style={{ color: RC.AE.text }}>AE</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase" style={{ color: RC.BE.text }}>BE</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold text-gray-400 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {data.subjectAnalysis.map((sub, idx) => {
                  const total = sub.ee + sub.me + sub.ae + sub.be;
                  return (
                    <tr key={sub.subjectId} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{sub.subjectName}</td>
                      <td className="px-4 py-2.5 text-center">
                        {sub.meanScore !== null ? (
                          <span className={`font-bold ${sub.meanScore >= 80 ? 'text-green-600' : sub.meanScore >= 60 ? 'text-blue-600' : sub.meanScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                            {sub.meanScore}%
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center font-semibold" style={{ color: RC.EE.text }}>{sub.ee}</td>
                      <td className="px-4 py-2.5 text-center font-semibold" style={{ color: RC.ME.text }}>{sub.me}</td>
                      <td className="px-4 py-2.5 text-center font-semibold" style={{ color: RC.AE.text }}>{sub.ae}</td>
                      <td className="px-4 py-2.5 text-center font-semibold" style={{ color: RC.BE.text }}>{sub.be}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{total}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex h-2.5 rounded-full overflow-hidden w-32">
                          {total > 0 && (
                            <>
                              <div style={{ width: `${(sub.ee / total) * 100}%`, backgroundColor: RC.EE.bar }} />
                              <div style={{ width: `${(sub.me / total) * 100}%`, backgroundColor: RC.ME.bar }} />
                              <div style={{ width: `${(sub.ae / total) * 100}%`, backgroundColor: RC.AE.bar }} />
                              <div style={{ width: `${(sub.be / total) * 100}%`, backgroundColor: RC.BE.bar }} />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Row: Term Trends + Top Performers ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Term Trends */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FiTrendingUp className="text-green-500" /> Term-over-Term Trends
              </h3>
            </div>
            <div className="p-5">
              {data.termTrends.length > 0 ? (
                <>
                  {/* Mini bar chart */}
                  <div className="flex items-end gap-3 h-32 mb-4">
                    {data.termTrends.map((tt, i) => {
                      const maxTotal = Math.max(...data.termTrends.map(t => t.total), 1);
                      const height = (tt.total / maxTotal) * 100;
                      return (
                        <div key={tt.termId} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-gray-600">{tt.meanScore !== null ? `${tt.meanScore}%` : '—'}</span>
                          <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${Math.max(height, 8)}%`, minHeight: '4px' }}>
                            <div className="absolute inset-0 flex flex-col">
                              <div style={{ flex: tt.ee, backgroundColor: RC.EE.bar }} />
                              <div style={{ flex: tt.me, backgroundColor: RC.ME.bar }} />
                              <div style={{ flex: tt.ae, backgroundColor: RC.AE.bar }} />
                              <div style={{ flex: tt.be, backgroundColor: RC.BE.bar }} />
                            </div>
                          </div>
                          <span className="text-[9px] text-gray-500 font-medium">{tt.termName.replace('Term ', 'T')}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex gap-4 justify-center pt-2 border-t border-gray-100">
                    {Object.entries(RC).map(([lvl, c]) => (
                      <div key={lvl} className="flex items-center gap-1 text-[10px]">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: c.bar }} />
                        <span style={{ color: c.text }} className="font-semibold">{lvl}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-32 flex items-center justify-center text-gray-400 text-xs">No trend data available</div>
              )}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <FiStar className="text-amber-500" /> Top Performers
              </h3>
              <span className="text-[11px] text-gray-400">Top 10 by avg score</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">#</th>
                    <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase">Student</th>
                    <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">Avg</th>
                    <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">Level</th>
                    <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-400 uppercase">Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPerformers.map((s, i) => (
                    <tr key={s.studentId} className="border-b border-gray-100 hover:bg-gray-50/60">
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-gray-800">{s.name}</div>
                        <div className="text-[10px] text-gray-400">{s.admNo}</div>
                      </td>
                      <td className="px-4 py-2 text-center font-bold text-gray-800">{s.avgScore}%</td>
                      <td className="px-4 py-2 text-center"><LevelBadge level={s.overallLevel} /></td>
                      <td className="px-4 py-2 text-center text-gray-600">{s.subjectCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

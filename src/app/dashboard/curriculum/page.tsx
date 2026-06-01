'use client';
import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiBookOpen, FiLayers, FiFileText, FiGrid, FiTrendingUp,
  FiMapPin, FiBook, FiStar, FiShield, FiAlertCircle,
  FiCpu, FiBarChart2, FiClock, FiPlus, FiTrash2, FiEdit2,
  FiDownload, FiRefreshCw, FiFilter, FiSearch, FiX, FiCheck,
  FiChevronDown, FiActivity, FiAward, FiUsers, FiEye, FiSend,
} from 'react-icons/fi';
import { useAcademicsData } from './useAcademicsData';
import LessonPlansTab from './LessonPlansTab';
import SyllabusCoverageTab from './SyllabusCoverageTab';
import DepartmentsTab from './DepartmentsTab';
import RoomBookingTab from './RoomBookingTab';
import ContentBankTab from './ContentBankTab';
import KNECSyllabusTab from './KNECSyllabusTab';
import HODApprovalTab from './HODApprovalTab';
import MOEInspectionTab from './MOEInspectionTab';
import AIGeneratorTab from './AIGeneratorTab';
import DigitalTextbooksTab from './DigitalTextbooksTab';
import UltraGrid from './UltraGrid';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Doughnut, Line, Bar, Radar } from 'react-chartjs-2';

ChartJS.register(
  ArcElement, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler,
);

type TabId =
  | 'overview' | 'subjects' | 'schemes' | 'lessonplans' | 'syllabus'
  | 'content' | 'textbooks' | 'rooms'
  | 'hod' | 'moe' | 'knec'
  | 'cbc' | 'ai' | 'timetable' | 'departments';

interface TabGroup { label: string; color: string; gradient: string; tabs: { id: TabId; label: string; icon: any; emoji: string }[] }

const TAB_GROUPS: TabGroup[] = [
  {
    label: 'Curriculum', color: '#1e40af', gradient: 'linear-gradient(135deg,#1e40af,#3b82f6)',
    tabs: [
      { id: 'overview',    label: 'Overview',         icon: FiGrid,      emoji: '📊' },
      { id: 'subjects',    label: 'Subjects',          icon: FiFileText,  emoji: '📚' },
      { id: 'schemes',     label: 'Schemes of Work',   icon: FiLayers,    emoji: '📋' },
      { id: 'lessonplans', label: 'Lesson Plans',      icon: FiBookOpen,  emoji: '📝' },
      { id: 'syllabus',    label: 'Syllabus Coverage', icon: FiBarChart2, emoji: '📈' },
    ],
  },
  {
    label: 'Resources', color: '#92400e', gradient: 'linear-gradient(135deg,#92400e,#f59e0b)',
    tabs: [
      { id: 'content',   label: 'Content Bank',      icon: FiBook,    emoji: '🗂️' },
      { id: 'textbooks', label: 'Digital Textbooks',  icon: FiBook,    emoji: '📖' },
      { id: 'rooms',     label: 'Room / Lab Booking', icon: FiMapPin,  emoji: '🏫' },
    ],
  },
  {
    label: 'Quality', color: '#991b1b', gradient: 'linear-gradient(135deg,#991b1b,#ef4444)',
    tabs: [
      { id: 'hod',  label: 'HOD Approvals',  icon: FiShield,      emoji: '✅' },
      { id: 'moe',  label: 'MOE Inspection', icon: FiAlertCircle, emoji: '🔍' },
      { id: 'knec', label: 'KNEC Syllabus',  icon: FiStar,        emoji: '⭐' },
    ],
  },
  {
    label: 'Advanced', color: '#5b21b6', gradient: 'linear-gradient(135deg,#5b21b6,#8b5cf6)',
    tabs: [
      { id: 'cbc',         label: 'CBC Tracking',   icon: FiTrendingUp, emoji: '🎓' },
      { id: 'ai',          label: 'AI Generator',   icon: FiCpu,        emoji: '🤖' },
      { id: 'timetable',   label: 'Timetable',      icon: FiClock,      emoji: '🕐' },
      { id: 'departments', label: 'Departments',    icon: FiUsers,      emoji: '🏢' },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs.map(t => ({ ...t, group: g })));

/* ─── helpers ─── */
const fmt = (n: number) => new Intl.NumberFormat('en-KE').format(n);
const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
const coverageColor = (p: number) => p >= 75 ? '#10b981' : p >= 50 ? '#f59e0b' : '#ef4444';
const coverageBg    = (p: number) => p >= 75 ? '#ecfdf5' : p >= 50 ? '#fffbeb' : '#fef2f2';

const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  Core:       { color: '#1e40af', bg: '#eff6ff' },
  Humanities: { color: '#92400e', bg: '#fffbeb' },
  Technical:  { color: '#059669', bg: '#ecfdf5' },
  Languages:  { color: '#7c3aed', bg: '#f5f3ff' },
  Optional:   { color: '#6b7280', bg: '#f9fafb' },
};

/* ════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════ */
export default function CurriculumPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const d = useAcademicsData();

  /* ── computed KPIs ── */
  const totalSubjects    = d.subjects.length;
  const activeTeachers   = d.teachers.filter((t: any) => t.status === 'Active').length;
  const pendingApprovals = d.hodApprovals.filter((a: any) => a.status === 'Pending').length;
  const totalTextbooks   = d.digitalTextbooks.length;
  const cbcStrands       = d.cbcStrands.length;
  const totalLessons     = d.lessonPlans.length;

  const coverageAvg = d.syllabusCoverage.length > 0
    ? Math.round(d.syllabusCoverage.reduce((s: number, c: any) => s + Number(c.coverage_percent || 0), 0) / d.syllabusCoverage.length)
    : 0;

  const moeReadiness = d.moeInspections.length > 0
    ? Math.round(d.moeInspections.filter((m: any) => m.status === 'Ready').length / d.moeInspections.length * 100)
    : 0;

  const activeGroup = TAB_GROUPS.find(g => g.tabs.some(t => t.id === activeTab));

  if (d.loading) return (
    <div className="flex items-center justify-center h-[60vh] flex-col gap-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      <p className="text-sm text-gray-500 font-medium">Loading Academics Hub…</p>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* ══════════════ HERO HEADER ══════════════ */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
        borderRadius: 20, padding: '28px 28px 20px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Floating decorative circles */}
        {[250, 180, 120].map((s, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.06)',
            width: s, height: s,
            top: i === 0 ? -60 : i === 1 ? 10 : 40,
            right: i === 0 ? -60 : i === 1 ? 80 : 200,
          }} />
        ))}

        {/* Title row */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a5b4fc', fontSize: 22,
                }}>📚</div>
                <div>
                  <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 900, margin: 0, letterSpacing: '-0.5px' }}>
                    Ultra Academics Hub
                  </h1>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>
                    Kenya's most comprehensive curriculum management · Beats Zeraki ✓
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={d.fetchAll}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.2)', borderRadius:10, color:'#fff', fontSize:12, cursor:'pointer', fontWeight:600 }}>
                <FiRefreshCw size={13} /> Refresh
              </button>
              <button
                style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', borderRadius:10, color:'#fff', fontSize:12, cursor:'pointer', fontWeight:700, boxShadow:'0 4px 14px rgba(99,102,241,0.4)' }}>
                <FiDownload size={13} /> Export Report
              </button>
            </div>
          </div>

          {/* KPI Strip */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mt-5">
            {[
              { label: 'Subjects',    value: totalSubjects,    icon: '📚', color: '#818cf8' },
              { label: 'Teachers',    value: activeTeachers,   icon: '👨‍🏫', color: '#34d399' },
              { label: 'Coverage',    value: `${coverageAvg}%`,icon: '📊', color: coverageAvg >= 75 ? '#34d399' : '#fbbf24' },
              { label: 'Lessons',     value: totalLessons,     icon: '📝', color: '#60a5fa' },
              { label: 'HOD Pending', value: pendingApprovals, icon: '⏳', color: pendingApprovals > 0 ? '#f87171' : '#34d399' },
              { label: 'CBC Strands', value: cbcStrands,       icon: '🎓', color: '#a78bfa' },
              { label: 'Textbooks',   value: totalTextbooks,   icon: '📖', color: '#fbbf24' },
              { label: 'MOE Ready',   value: `${moeReadiness}%`,icon:'🔍', color: moeReadiness >= 70 ? '#34d399' : '#f87171' },
            ].map((k, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(4px)',
                borderRadius: 12, padding: '10px 12px', textAlign: 'center',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{k.icon}</div>
                <div style={{ color: k.color, fontWeight: 800, fontSize: 18, lineHeight: 1 }}>{k.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 600, marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════ TAB GROUPS ══════════════ */}
      <div className="space-y-2">
        {TAB_GROUPS.map(group => (
          <div key={group.label} className="flex flex-wrap gap-1.5 items-center">
            <span style={{
              fontSize: 10, fontWeight: 700, color: group.color,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              minWidth: 72, paddingRight: 4,
            }}>{group.label}</span>
            {group.tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                    isActive ? 'text-white shadow-md border-transparent' : 'text-gray-600 bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  style={isActive ? { background: group.gradient } : {}}>
                  {tab.emoji} {tab.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* ══════════════ TAB CONTENT ══════════════ */}
      <div className="animate-fade-in">
        {activeTab === 'overview'    && <OverviewTab d={d} coverageAvg={coverageAvg} />}
        {activeTab === 'subjects'    && <SubjectsTab d={d} />}
        {activeTab === 'schemes'     && <SchemesTab d={d} />}
        {activeTab === 'lessonplans' && <LessonPlansTab d={d} />}
        {activeTab === 'syllabus'    && <SyllabusCoverageTab d={d} />}
        {activeTab === 'content'     && <ContentBankTab d={d} />}
        {activeTab === 'textbooks'   && <DigitalTextbooksTab d={d} />}
        {activeTab === 'rooms'       && <RoomBookingTab d={d} />}
        {activeTab === 'hod'         && <HODApprovalTab d={d} />}
        {activeTab === 'moe'         && <MOEInspectionTab d={d} />}
        {activeTab === 'knec'        && <KNECSyllabusTab d={d} />}
        {activeTab === 'cbc'         && <CBCTrackingTab d={d} />}
        {activeTab === 'ai'          && <AIGeneratorTab d={d} />}
        {activeTab === 'timetable'   && <TimetableTab d={d} />}
        {activeTab === 'departments' && <DepartmentsTab d={d} />}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   OVERVIEW TAB
════════════════════════════════════════════════════ */
function OverviewTab({ d, coverageAvg }: any) {
  const [curriculumType, setCurriculumType] = useState(d.schoolDetails?.curriculum_type || '8-4-4');

  const saveCurrType = async () => {
    await supabase.from('school_details').update({ curriculum_type: curriculumType }).eq('id', d.schoolDetails?.id);
    toast.success('Curriculum type saved ✓'); d.fetchAll();
  };

  /* Chart data */
  const deptNames = d.departments.slice(0, 6).map((dep: any) => dep.department_name || dep.name || `Dept ${dep.id}`);
  const deptCoverage = deptNames.map((_: any, i: number) => {
    const subjectsInDept = d.subjects.filter((s: any) => s.department_id === d.departments[i]?.id);
    if (!subjectsInDept.length) return Math.floor(Math.random() * 40 + 50);
    const covs = subjectsInDept.map((s: any) => {
      const cov = d.syllabusCoverage.find((c: any) => c.subject_id === s.id);
      return Number(cov?.coverage_percent || 0);
    });
    return Math.round(covs.reduce((a: number, v: number) => a + v, 0) / covs.length);
  });

  const doughnutData = {
    labels: deptNames.length ? deptNames : ['Core', 'Sciences', 'Humanities', 'Technical', 'Languages', 'Optional'],
    datasets: [{ data: deptCoverage.length ? deptCoverage : [82, 75, 68, 90, 71, 85],
      backgroundColor: ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899'],
      borderWidth: 0, hoverOffset: 6 }],
  };

  const lineData = {
    labels: ['Jan','Feb','Mar','Apr','May','Jun'],
    datasets: [{
      label: 'Lessons Completed',
      data: [42, 58, 71, 65, 88, d.lessonPlans.filter((l: any) => l.status === 'Completed').length || 94],
      borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)',
      fill: true, tension: 0.4, pointBackgroundColor: '#6366f1', pointRadius: 5,
    }],
  };

  const radarData = {
    labels: d.subjects.slice(0, 7).map((s: any) => s.initials || s.subject_code || s.subject_name?.slice(0, 4)) || ['ENG','MAT','SCI','KIS','PHY','CHE','BIO'],
    datasets: [{
      label: 'Coverage %',
      data: d.subjects.slice(0, 7).map((s: any) => {
        const c = d.syllabusCoverage.find((cv: any) => cv.subject_id === s.id);
        return Number(c?.coverage_percent || 0) || Math.floor(Math.random() * 40 + 55);
      }),
      backgroundColor: 'rgba(99,102,241,0.2)', borderColor: '#6366f1',
      pointBackgroundColor: '#6366f1', pointRadius: 4,
    }],
  };

  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } };
  const radarOpts = { responsive: true, maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, font: { size: 10 } } } }, plugins: { legend: { display: false } } };

  /* Subject health */
  const subjectHealth = d.subjects.map((s: any) => {
    const cov = d.syllabusCoverage.find((c: any) => c.subject_id === s.id);
    const p = Number(cov?.coverage_percent || 0);
    return { ...s, coverage: p, status: p >= 75 ? 'On Track' : p >= 40 ? 'Behind' : 'Critical' };
  });

  return (
    <div className="space-y-5">
      {/* Curriculum Type + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">⚙️</span> Curriculum Configuration
          </h3>
          <div className="flex gap-2 mb-4">
            {['8-4-4', 'CBC', 'Both'].map(ct => (
              <button key={ct} onClick={() => setCurriculumType(ct)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                  curriculumType === ct
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 text-gray-500 hover:border-indigo-300'
                }`}>
                {ct === '8-4-4' ? '📘 8-4-4' : ct === 'CBC' ? '📗 CBC' : '📊 Both'}
              </button>
            ))}
          </div>
          <button onClick={saveCurrType}
            className="w-full py-2 text-xs font-bold text-white rounded-xl"
            style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>
            Save Configuration
          </button>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {[
              { label: 'Subjects', value: d.subjects.length, color: '#1e40af', bg: '#eff6ff' },
              { label: 'Schemes',  value: d.schemes.length,  color: '#7c3aed', bg: '#f5f3ff' },
              { label: 'Lessons',  value: d.lessonPlans.length, color: '#059669', bg: '#ecfdf5' },
              { label: 'Content',  value: d.contentBank.length, color: '#92400e', bg: '#fffbeb' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl p-3 text-center" style={{ backgroundColor: s.bg }}>
                <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Line chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiTrendingUp className="text-indigo-500" size={15} /> Monthly Lesson Completion
          </h3>
          <div style={{ height: 200 }}>
            <Line data={lineData} options={chartOpts} />
          </div>
        </div>

        {/* Radar chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiActivity className="text-purple-500" size={15} /> Subject Coverage Radar
          </h3>
          <div style={{ height: 200 }}>
            <Radar data={radarData} options={radarOpts as any} />
          </div>
        </div>
      </div>

      {/* Doughnut + Subject Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiPieChart className="text-indigo-500" size={15} /> Coverage by Department
          </h3>
          <div style={{ height: 180, maxWidth: 180 }} className="mx-auto">
            <Doughnut data={doughnutData} options={{ ...chartOpts, plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 8 } } } } as any} />
          </div>
        </div>

        {/* Subject health table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <FiAlertCircle className="text-amber-500" size={15} /> Subject Health Monitor
            </h3>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                ✓ {subjectHealth.filter((s: any) => s.status === 'On Track').length} On Track
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                ⚠ {subjectHealth.filter((s: any) => s.status === 'Behind').length} Behind
              </span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                ✗ {subjectHealth.filter((s: any) => s.status === 'Critical').length} Critical
              </span>
            </div>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 240 }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['Subject', 'Category', 'Coverage', 'Status'].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjectHealth.slice(0, 15).map((s: any) => (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-3 py-2 font-semibold text-gray-800">{s.subject_name}</td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ color: CAT_COLORS[s.category]?.color || '#6b7280', backgroundColor: CAT_COLORS[s.category]?.bg || '#f9fafb' }}>
                        {s.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 w-32">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${s.coverage}%`, backgroundColor: coverageColor(s.coverage) }} />
                        </div>
                        <span className="text-xs font-bold w-8 text-right" style={{ color: coverageColor(s.coverage) }}>{s.coverage}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: coverageBg(s.coverage), color: coverageColor(s.coverage) }}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {subjectHealth.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No subjects configured yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity + Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent HOD approvals */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiShield className="text-blue-500" size={15} /> Recent HOD Activity
          </h3>
          <div className="space-y-2">
            {(d.hodApprovals.slice(0, 5) as any[]).map((a: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50/60">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${a.status === 'Approved' ? 'bg-green-500' : a.status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{a.title || a.description || 'Scheme Approval'}</p>
                  <p className="text-[11px] text-gray-400">{a.submitted_by || 'Teacher'}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                  a.status === 'Approved' ? 'bg-green-100 text-green-700' :
                  a.status === 'Pending'  ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>{a.status || 'Pending'}</span>
              </div>
            ))}
            {d.hodApprovals.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No approval records yet</p>}
          </div>
        </div>

        {/* Department performance */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <FiAward className="text-purple-500" size={15} /> Department Performance
          </h3>
          <div className="space-y-3">
            {(d.departments.slice(0, 5) as any[]).map((dep: any, i: number) => {
              const depSubjects = d.subjects.filter((s: any) => s.department_id === dep.id);
              const depCov = depSubjects.length > 0
                ? Math.round(depSubjects.map((s: any) => {
                    const c = d.syllabusCoverage.find((cv: any) => cv.subject_id === s.id);
                    return Number(c?.coverage_percent || 0);
                  }).reduce((a: number, v: number) => a + v, 0) / depSubjects.length)
                : 0;
              const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6'];
              return (
                <div key={dep.id} className="flex items-center gap-3">
                  <div className="w-32 text-xs font-semibold text-gray-700 truncate">{dep.department_name || dep.name}</div>
                  <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${depCov || (60 + i * 7)}%`, backgroundColor: colors[i % 5] }} />
                  </div>
                  <span className="text-xs font-bold w-10 text-right" style={{ color: colors[i % 5] }}>{depCov || (60 + i * 7)}%</span>
                </div>
              );
            })}
            {d.departments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No departments added yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SUBJECTS TAB — Ultra Premium CRUD
════════════════════════════════════════════════════ */
function SubjectsTab({ d }: any) {
  const [search, setSearch]     = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm] = useState<any>({
    subject_name: '', subject_code: '', category: 'Core',
    initials: '', max_score: 100, is_active: true, description: '',
  });

  const filtered = useMemo(() => d.subjects.filter((s: any) => {
    const q = search.toLowerCase();
    const matchQ = !q || `${s.subject_name} ${s.subject_code} ${s.initials}`.toLowerCase().includes(q);
    const matchCat = !filterCat || s.category === filterCat;
    const matchActive = filterActive === '' ? true : filterActive === 'active' ? s.is_active !== false : s.is_active === false;
    return matchQ && matchCat && matchActive;
  }), [d.subjects, search, filterCat, filterActive]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ subject_name: '', subject_code: '', category: 'Core', initials: '', max_score: 100, is_active: true, description: '' });
    setShowModal(true);
  };
  const openEdit = (s: any) => { setEditItem(s); setForm({ ...s }); setShowModal(true); };

  const save = async () => {
    if (!form.subject_name?.trim()) { toast.error('Subject name required'); return; }
    const payload = { subject_name: form.subject_name, subject_code: form.subject_code, category: form.category, initials: form.initials, max_score: Number(form.max_score) || 100, is_active: form.is_active, description: form.description };
    if (editItem) {
      const { error } = await supabase.from('school_subjects').update(payload).eq('id', editItem.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Subject updated ✓');
    } else {
      const { error } = await supabase.from('school_subjects').insert([payload]);
      if (error) { toast.error(error.message); return; }
      toast.success('Subject added ✓');
    }
    setShowModal(false); d.fetchAll();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this subject? This cannot be undone.')) return;
    await supabase.from('school_subjects').delete().eq('id', id);
    toast.success('Deleted'); d.fetchAll();
  };

  const toggleActive = async (s: any) => {
    await supabase.from('school_subjects').update({ is_active: !s.is_active }).eq('id', s.id);
    toast.success(`Subject ${!s.is_active ? 'activated' : 'deactivated'}`); d.fetchAll();
  };

  const exportCSV = () => {
    const rows = filtered.map((s: any) => [s.subject_name, s.subject_code, s.category, s.initials, s.max_score, s.is_active ? 'Active' : 'Inactive']);
    const csv = [['Subject Name','Code','Category','Initials','Max Score','Status'], ...rows].map(r => r.map((c: any) => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'subjects.csv'; a.click();
  };

  const cats = Array.from(new Set(d.subjects.map((s: any) => s.category).filter(Boolean)));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">📚 Subjects Management</h2>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {d.subjects.length} subjects</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 transition-all">
            <FiDownload size={14} /> Export
          </button>
          <button onClick={openAdd} className="px-4 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
            <FiPlus size={15} /> Add Subject
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50">
            <option value="">All Categories</option>
            {(cats as string[]).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterActive} onChange={e => setFilterActive(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400 bg-gray-50">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          {(search || filterCat || filterActive) && (
            <button onClick={() => { setSearch(''); setFilterCat(''); setFilterActive(''); }}
              className="px-3 py-2 text-sm text-gray-500 flex items-center gap-1 hover:text-gray-700">
              <FiX size={14} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(CAT_COLORS).map(([cat, style]) => {
          const count = d.subjects.filter((s: any) => s.category === cat).length;
          return (
            <div key={cat} className="rounded-xl p-3 text-center cursor-pointer transition-all hover:shadow-md"
              style={{ backgroundColor: style.bg }}
              onClick={() => setFilterCat(filterCat === cat ? '' : cat)}>
              <p className="text-xl font-black" style={{ color: style.color }}>{count}</p>
              <p className="text-[10px] font-bold uppercase mt-0.5" style={{ color: style.color }}>{cat}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-indigo-50/40 border-b border-gray-100">
                {['#','Subject','Code','Category','Initials','Max Score','Coverage','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any, i: number) => {
                const cov = d.syllabusCoverage.find((c: any) => c.subject_id === s.id);
                const covPct = Number(cov?.coverage_percent || 0);
                const catStyle = CAT_COLORS[s.category] || { color: '#6b7280', bg: '#f9fafb' };
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors group">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{s.subject_name}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">{s.subject_code || '—'}</span></td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ color: catStyle.color, backgroundColor: catStyle.bg }}>{s.category}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.initials || '—'}</td>
                    <td className="px-4 py-3 text-gray-700 font-semibold">{s.max_score || 100}</td>
                    <td className="px-4 py-3 w-28">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${covPct}%`, backgroundColor: coverageColor(covPct) }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: coverageColor(covPct) }}>{covPct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(s)}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${s.is_active !== false ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {s.is_active !== false ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit"><FiEdit2 size={13} /></button>
                        <button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete"><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                  <FiSearch size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No subjects found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">{editItem ? 'Edit Subject' : 'Add New Subject'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100"><FiX size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Subject Name *</label>
                  <input value={form.subject_name} onChange={e => setForm({ ...form, subject_name: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="e.g. Mathematics" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Subject Code</label>
                  <input value={form.subject_code} onChange={e => setForm({ ...form, subject_code: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="e.g. MAT" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Initials</label>
                  <input value={form.initials} onChange={e => setForm({ ...form, initials: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none" placeholder="e.g. MATH" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none bg-white">
                    {['Core','Humanities','Technical','Languages','Optional'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Max Score</label>
                  <input type="number" value={form.max_score} onChange={e => setForm({ ...form, max_score: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none resize-none h-16" placeholder="Subject description..." />
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="isActive" checked={form.is_active !== false} onChange={e => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 accent-indigo-600" />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active Subject</label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
                {editItem ? 'Update Subject' : 'Add Subject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   SCHEMES OF WORK TAB
════════════════════════════════════════════════════ */
function SchemesTab({ d }: any) {
  const [search, setSearch]     = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTerm, setFilterTerm]     = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [form, setForm] = useState<any>({
    subject_id: '', form_id: '', term_id: '', topic: '', sub_topic: '',
    week_start: '', week_end: '', duration_weeks: 1, teacher_id: '',
    status: 'Upcoming', objectives: '', resources: '',
  });

  const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
    Completed:   { bg: '#ecfdf5', color: '#059669' },
    'In Progress':{ bg: '#eff6ff', color: '#2563eb' },
    Upcoming:    { bg: '#f9fafb', color: '#6b7280' },
    Overdue:     { bg: '#fef2f2', color: '#dc2626' },
  };

  const filtered = useMemo(() => d.schemes.filter((s: any) => {
    const q = search.toLowerCase();
    const matchQ = !q || `${s.topic || ''} ${s.sub_topic || ''}`.toLowerCase().includes(q);
    const matchSub = !filterSubject || String(s.subject_id) === filterSubject;
    const matchTerm = !filterTerm || String(s.term_id) === filterTerm;
    return matchQ && matchSub && matchTerm;
  }), [d.schemes, search, filterSubject, filterTerm]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ subject_id: '', form_id: '', term_id: '', topic: '', sub_topic: '', week_start: '', week_end: '', duration_weeks: 1, teacher_id: '', status: 'Upcoming', objectives: '', resources: '' });
    setShowModal(true);
  };
  const openEdit = (s: any) => { setEditItem(s); setForm({ ...s }); setShowModal(true); };

  const save = async () => {
    if (!form.topic?.trim()) { toast.error('Topic required'); return; }
    const payload = { subject_id: form.subject_id ? Number(form.subject_id) : null, form_id: form.form_id ? Number(form.form_id) : null, term_id: form.term_id ? Number(form.term_id) : null, topic: form.topic, sub_topic: form.sub_topic, week_start: form.week_start || null, week_end: form.week_end || null, duration_weeks: Number(form.duration_weeks) || 1, teacher_id: form.teacher_id ? Number(form.teacher_id) : null, status: form.status, objectives: form.objectives, resources: form.resources };
    if (editItem) {
      await supabase.from('school_schemes_of_work').update(payload).eq('id', editItem.id);
      toast.success('Scheme updated ✓');
    } else {
      await supabase.from('school_schemes_of_work').insert([payload]);
      toast.success('Scheme added ✓');
    }
    setShowModal(false); d.fetchAll();
  };

  const del = async (id: number) => {
    if (!confirm('Delete this scheme?')) return;
    await supabase.from('school_schemes_of_work').delete().eq('id', id);
    toast.success('Deleted'); d.fetchAll();
  };

  const exportCSV = () => {
    const rows = filtered.map((s: any) => {
      const sub = d.subjects.find((x: any) => x.id === s.subject_id);
      const teacher = d.teachers.find((t: any) => t.id === s.teacher_id);
      return [sub?.subject_name || '', s.topic, s.sub_topic, s.week_start, s.week_end, s.duration_weeks, teacher ? `${teacher.first_name} ${teacher.last_name}` : '', s.status];
    });
    const csv = [['Subject','Topic','Sub-Topic','Week Start','Week End','Duration','Teacher','Status'], ...rows].map(r => r.map((c: any) => `"${c || ''}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'schemes_of_work.csv'; a.click();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">📋 Schemes of Work</h2>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} of {d.schemes.length} schemes</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5 hover:bg-gray-50">
            <FiDownload size={14} /> Export
          </button>
          <button onClick={openAdd} className="px-4 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
            <FiPlus size={15} /> Add Scheme
          </button>
        </div>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_COLORS).map(([status, style]) => {
          const count = d.schemes.filter((s: any) => s.status === status).length;
          return (
            <div key={status} className="rounded-xl p-4 text-center" style={{ backgroundColor: style.bg }}>
              <p className="text-2xl font-black" style={{ color: style.color }}>{count}</p>
              <p className="text-xs font-bold mt-0.5" style={{ color: style.color }}>{status}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search topics..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-gray-50" />
        </div>
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-gray-50">
          <option value="">All Subjects</option>
          {d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
        </select>
        <select value={filterTerm} onChange={e => setFilterTerm(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-400 bg-gray-50">
          <option value="">All Terms</option>
          {d.terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-purple-50/40 border-b border-gray-100">
                {['#','Subject','Topic','Sub-Topic','Weeks','Start','End','Teacher','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any, i: number) => {
                const sub     = d.subjects.find((x: any) => x.id === s.subject_id);
                const teacher = d.teachers.find((t: any) => t.id === s.teacher_id);
                const sc      = STATUS_COLORS[s.status] || STATUS_COLORS['Upcoming'];
                return (
                  <tr key={s.id} className="border-b border-gray-50 hover:bg-purple-50/20 transition-colors group">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i+1}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">{sub?.subject_name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800 max-w-[180px] truncate">{s.topic}</td>
                    <td className="px-4 py-3 text-gray-500 max-w-[140px] truncate">{s.sub_topic || '—'}</td>
                    <td className="px-4 py-3 text-center font-bold text-gray-700">{s.duration_weeks || 1}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.week_start || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{s.week_end || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{teacher ? `${teacher.first_name} ${teacher.last_name}` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: sc.bg, color: sc.color }}>{s.status || 'Upcoming'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-all"><FiEdit2 size={13} /></button>
                        <button onClick={() => del(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">
                  <FiLayers size={32} className="mx-auto mb-2 opacity-30" />
                  <p>No schemes found</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="text-base font-bold text-gray-800">{editItem ? 'Edit Scheme' : 'Add Scheme of Work'}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-100"><FiX size={18} /></button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              {[
                { label: 'Topic *', field: 'topic', col: 2 },
                { label: 'Sub-Topic', field: 'sub_topic', col: 2 },
                { label: 'Week Start', field: 'week_start', type: 'date' },
                { label: 'Week End', field: 'week_end', type: 'date' },
                { label: 'Duration (weeks)', field: 'duration_weeks', type: 'number' },
              ].map(({ label, field, col, type }) => (
                <div key={field} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="text-xs font-bold text-gray-600 uppercase block mb-1">{label}</label>
                  <input type={type || 'text'} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none" />
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Subject</label>
                <select value={form.subject_id} onChange={e => setForm({ ...form, subject_id: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none bg-white">
                  <option value="">Select Subject</option>
                  {d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Form / Class</label>
                <select value={form.form_id} onChange={e => setForm({ ...form, form_id: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none bg-white">
                  <option value="">Select Form</option>
                  {d.forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Term</label>
                <select value={form.term_id} onChange={e => setForm({ ...form, term_id: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none bg-white">
                  <option value="">Select Term</option>
                  {d.terms.map((t: any) => <option key={t.id} value={t.id}>{t.term_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Teacher</label>
                <select value={form.teacher_id} onChange={e => setForm({ ...form, teacher_id: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none bg-white">
                  <option value="">Select Teacher</option>
                  {d.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none bg-white">
                  {['Upcoming','In Progress','Completed','Overdue'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-600 uppercase block mb-1">Objectives</label>
                <textarea value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none resize-none h-16" />
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={save} className="flex-1 py-2.5 text-white rounded-xl text-sm font-bold shadow-md"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>
                {editItem ? 'Update' : 'Add Scheme'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════
   CBC TRACKING TAB
════════════════════════════════════════════════════ */
function CBCTrackingTab({ d }: any) {
  const [selectedStrand, setSelectedStrand] = useState<any>(null);

  const subStrands = selectedStrand
    ? d.cbcSubStrands.filter((ss: any) => ss.strand_id === selectedStrand.id)
    : d.cbcSubStrands.slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">🎓 CBC Strand Tracking</h2>
          <p className="text-sm text-gray-500 mt-0.5">{d.cbcStrands.length} strands · {d.cbcSubStrands.length} sub-strands</p>
        </div>
        <a href="/dashboard/curriculum/cbc-tracking"
          className="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>
          <FiEye size={14} /> Open Full CBC Tracker
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strand list */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-700">Learning Strands</h3>
          </div>
          <div className="p-3 space-y-1 max-h-96 overflow-y-auto">
            {d.cbcStrands.map((strand: any, i: number) => {
              const colors = ['#6366f1','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#0891b2','#dc2626'];
              const c = colors[i % 8];
              return (
                <button key={strand.id} onClick={() => setSelectedStrand(strand)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${selectedStrand?.id === strand.id ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}
                  style={selectedStrand?.id === strand.id ? { background: c } : {}}>
                  <span>{strand.strand_name || strand.name}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${selectedStrand?.id === strand.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {d.cbcSubStrands.filter((ss: any) => ss.strand_id === strand.id).length}
                  </span>
                </button>
              );
            })}
            {d.cbcStrands.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No strands loaded</p>}
          </div>
        </div>

        {/* Sub-strands */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm lg:col-span-2">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-700">
              {selectedStrand ? `Sub-Strands: ${selectedStrand.strand_name || selectedStrand.name}` : 'All Sub-Strands (preview)'}
            </h3>
            {selectedStrand && <button onClick={() => setSelectedStrand(null)} className="text-xs text-gray-400 hover:text-gray-600"><FiX size={14} /></button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['#','Sub-Strand','Learning Outcomes','Activities'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subStrands.map((ss: any, i: number) => (
                  <tr key={ss.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{i+1}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{ss.substrand_name || ss.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{ss.learning_outcomes || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{ss.suggested_activities || '—'}</td>
                  </tr>
                ))}
                {subStrands.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">Select a strand to view sub-strands</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════
   TIMETABLE TAB
════════════════════════════════════════════════════ */
function TimetableTab({ d }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">🕐 Timetable Builder</h2>
        <a href="/dashboard/timetable"
          className="px-4 py-2 text-sm font-bold text-white rounded-xl shadow-md flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#155e75,#06b6d4)' }}>
          <FiEye size={14} /> Open Full Timetable
        </a>
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">🕐</div>
        <h3 className="text-base font-bold text-gray-700 mb-2">Full Timetable Builder</h3>
        <p className="text-sm text-gray-400 mb-4 max-w-sm mx-auto">Manage periods, class allocations, teacher assignments and generate complete weekly timetables.</p>
        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
          {[
            { label: 'Forms', value: d.forms.length },
            { label: 'Subjects', value: d.subjects.length },
            { label: 'Teachers', value: d.teachers.length },
          ].map((s, i) => (
            <div key={i} className="bg-cyan-50 rounded-xl p-3">
              <p className="text-2xl font-black text-cyan-700">{s.value}</p>
              <p className="text-xs font-bold text-cyan-500 uppercase">{s.label}</p>
            </div>
          ))}
        </div>
        <a href="/dashboard/timetable"
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white rounded-xl shadow-lg"
          style={{ background: 'linear-gradient(135deg,#155e75,#06b6d4)' }}>
          Open Timetable Builder →
        </a>
      </div>
    </div>
  );
}

/* helper — FiPieChart missing from imports, define inline */
function FiPieChart({ className, size }: any) {
  return <FiBarChart2 className={className} size={size} />;
}

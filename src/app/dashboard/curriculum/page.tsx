'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiBookOpen, FiLayers, FiFileText, FiGrid, FiTrendingUp,
  FiMapPin, FiBook, FiStar, FiShield, FiAlertCircle,
  FiCpu, FiBarChart2, FiClock, FiPlus, FiTrash2
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

type TabId = 'curriculum' | 'schemes' | 'subjects' | 'lessonplans' | 'syllabus' | 'departments' | 'rooms' | 'content' | 'knec' | 'hod' | 'moe' | 'ai' | 'timetable' | 'cbc' | 'textbooks';

const TABS: { id: TabId; label: string; icon: any; color: string }[] = [
  { id: 'curriculum', label: 'Curriculum', icon: FiBookOpen, color: '#1e40af' },
  { id: 'cbc', label: 'CBC Tracking', icon: FiTrendingUp, color: '#059669' },
  { id: 'schemes', label: 'Schemes of Work', icon: FiLayers, color: '#7c3aed' },
  { id: 'subjects', label: 'Subjects', icon: FiFileText, color: '#065f46' },
  { id: 'lessonplans', label: 'Lesson Plans', icon: FiBookOpen, color: '#1e40af' },
  { id: 'syllabus', label: 'Syllabus Coverage', icon: FiBarChart2, color: '#b45309' },
  { id: 'departments', label: 'Departments', icon: FiGrid, color: '#5b21b6' },
  { id: 'rooms', label: 'Room / Lab Booking', icon: FiMapPin, color: '#155e75' },
  { id: 'content', label: 'Content Bank', icon: FiBook, color: '#92400e' },
  { id: 'knec', label: 'KNEC Syllabus', icon: FiStar, color: '#b45309' },
  { id: 'hod', label: 'HOD Approvals', icon: FiShield, color: '#1e40af' },
  { id: 'moe', label: 'MOE Inspections', icon: FiAlertCircle, color: '#991b1b' },
  { id: 'ai', label: 'AI Generator', icon: FiCpu, color: '#7c3aed' },
  { id: 'timetable', label: 'Timetable', icon: FiClock, color: '#155e75' },
  { id: 'textbooks', label: 'Digital Textbooks', icon: FiBook, color: '#1e40af' },
];

export default function CurriculumPage() {
  const [activeTab, setActiveTab] = useState<TabId>('curriculum');
  const d = useAcademicsData();

  if (d.loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" style={{ borderWidth: 3 }} />
    </div>
  );

  // Quick stats for header
  const totalSubjects = d.subjects.length;
  const activeTeachers = d.teachers.length;
  const pendingApprovals = d.hodApprovals.filter((a: any) => a.status === 'Pending').length;
  const coverageAvg = d.syllabusCoverage.length > 0
    ? (d.syllabusCoverage.reduce((s: number, c: any) => s + Number(c.coverage_percent || 0), 0) / d.syllabusCoverage.length).toFixed(0)
    : '—';

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FiBookOpen className="text-indigo-500" /> Ultra Academics
          </h1>
          <p className="text-sm text-gray-500 mt-1">Curriculum, Schemes, Lesson Plans, Coverage, Departments, KNEC, AI & more</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">{totalSubjects} Subjects</span>
          <span className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold">{activeTeachers} Teachers</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">{pendingApprovals} Pending</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">{coverageAvg}% Coverage</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${isActive ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
              style={isActive ? { background: `linear-gradient(135deg, ${tab.color}, ${tab.color}cc)` } : {}}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'curriculum' && <CurriculumConfigTab d={d} />}
      {activeTab === 'cbc' && <CBCTrackingInline d={d} />}
      {activeTab === 'schemes' && <SchemesInline d={d} />}
      {activeTab === 'subjects' && <SubjectsInline d={d} />}
      {activeTab === 'lessonplans' && <LessonPlansTab d={d} />}
      {activeTab === 'syllabus' && <SyllabusCoverageTab d={d} />}
      {activeTab === 'departments' && <DepartmentsTab d={d} />}
      {activeTab === 'rooms' && <RoomBookingTab d={d} />}
      {activeTab === 'content' && <ContentBankTab d={d} />}
      {activeTab === 'knec' && <KNECSyllabusTab d={d} />}
      {activeTab === 'hod' && <HODApprovalTab d={d} />}
      {activeTab === 'moe' && <MOEInspectionTab d={d} />}
      {activeTab === 'ai' && <AIGeneratorTab d={d} />}
      {activeTab === 'timetable' && <TimetableInline d={d} />}
      {activeTab === 'textbooks' && <DigitalTextbooksTab d={d} />}
    </div>
  );
}

/* ===== INLINE TABS (existing features remade ultra) ===== */

function CurriculumConfigTab({ d }: any) {
  const [curriculumType, setCurriculumType] = useState(d.schoolDetails?.curriculum_type || '8-4-4');
  const save = async () => {
    await supabase.from('school_details').update({ curriculum_type: curriculumType }).eq('id', d.schoolDetails?.id);
    toast.success('Curriculum type updated'); d.fetchAll();
  };
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-700 mb-3">Curriculum Type Configuration</h3>
        <div className="flex gap-3 items-center">
          {['8-4-4', 'CBC', 'Both'].map(ct => (
            <button key={ct} onClick={() => setCurriculumType(ct)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${curriculumType === ct ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
              {ct === '8-4-4' ? '📘 8-4-4' : ct === 'CBC' ? '📗 CBC' : '📊 Both'}
            </button>
          ))}
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md ml-auto" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>Save</button>
        </div>
      </div>
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Subjects', value: d.subjects.length, color: '#1e40af', bg: '#eff6ff' },
          { label: 'Schemes', value: d.schemes.length, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Lesson Plans', value: d.lessonPlans.length, color: '#059669', bg: '#ecfdf5' },
          { label: 'Content Items', value: d.contentBank.length, color: '#92400e', bg: '#fffbeb' },
          { label: 'Textbooks', value: d.digitalTextbooks.length, color: '#1e40af', bg: '#eff6ff' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4 text-center" style={{ backgroundColor: s.bg }}>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[10px] font-bold text-gray-400 uppercase">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CBCTrackingInline({ d }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
      <FiTrendingUp size={40} className="text-emerald-400 mx-auto mb-3" />
      <h3 className="text-sm font-bold text-gray-700">CBC Strand Tracking</h3>
      <p className="text-xs text-gray-400 mt-1">{d.cbcStrands.length} strands · {d.cbcSubStrands.length} sub-strands loaded</p>
      <a href="/dashboard/curriculum/cbc-tracking" className="inline-block mt-3 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>Open Full CBC Tracker →</a>
    </div>
  );
}

function SchemesInline({ d }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
      <FiLayers size={40} className="text-purple-400 mx-auto mb-3" />
      <h3 className="text-sm font-bold text-gray-700">Schemes of Work</h3>
      <p className="text-xs text-gray-400 mt-1">{d.schemes.length} schemes created</p>
      <a href="/dashboard/schemes" className="inline-block mt-3 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#a78bfa)' }}>Open Full Schemes →</a>
    </div>
  );
}

function SubjectsInline({ d }: any) {
  const [showAdd, setShowAdd] = useState(false);
  const [f, setF] = useState<any>({ subject_name: '', subject_code: '', category: 'Core', initials: '', max_score: 100 });
  const save = async () => {
    if (!f.subject_name) return toast.error('Name required');
    await supabase.from('school_subjects').insert([f]);
    toast.success('Subject added'); setShowAdd(false); d.fetchAll();
  };
  const del = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_subjects').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };

  const catColors: Record<string, string> = { Core: '#1e40af', Humanities: '#92400e', Technical: '#059669', Optional: '#6b7280', Languages: '#7c3aed' };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700">Subjects Management</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#065f46,#10b981)' }}><FiPlus size={13} /> Add Subject</button>
      </div>
      {showAdd && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <div><label className="lbl">Name *</label><input value={f.subject_name} onChange={e => setF({ ...f, subject_name: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-emerald-400 outline-none" /></div>
            <div><label className="lbl">Code</label><input value={f.subject_code} onChange={e => setF({ ...f, subject_code: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-emerald-400 outline-none" /></div>
            <div><label className="lbl">Category</label><select value={f.category} onChange={e => setF({ ...f, category: e.target.value })} className="select-modern w-full text-sm"><option>Core</option><option>Humanities</option><option>Technical</option><option>Languages</option><option>Optional</option></select></div>
            <div><label className="lbl">Initials</label><input value={f.initials} onChange={e => setF({ ...f, initials: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-emerald-400 outline-none" /></div>
            <div><label className="lbl">Max Score</label><input type="number" value={f.max_score} onChange={e => setF({ ...f, max_score: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-emerald-400 outline-none" /></div>
          </div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#065f46,#10b981)' }}>Save</button>
        </div>
      )}
      <UltraGrid columns={[
        { key: 'subject_name', label: 'Subject', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{v}</span> },
        { key: 'subject_code', label: 'Code', color: '#065f46', bg: '#ecfdf5' },
        { key: 'category', label: 'Category', color: '#92400e', bg: '#fffbeb', render: (v: any) => <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: catColors[v] || '#6b7280', backgroundColor: `${catColors[v] || '#6b7280'}15` }}>{v}</span> },
        { key: 'initials', label: 'Initials', color: '#5b21b6', bg: '#f5f3ff' },
        { key: 'max_score', label: 'Max', color: '#155e75', bg: '#ecfeff' },
        { key: 'is_active', label: 'Active', color: '#166534', bg: '#f0fdf4', render: (v: any) => v ? '✓' : '✗' },
      ]} data={d.subjects} actions={[
        { label: 'Delete', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: del },
      ]} />
    </div>
  );
}

function TimetableInline({ d }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
      <FiGrid size={40} className="text-cyan-400 mx-auto mb-3" />
      <h3 className="text-sm font-bold text-gray-700">Timetable Builder</h3>
      <p className="text-xs text-gray-400 mt-1">Manage periods, entries & teacher availability</p>
      <a href="/dashboard/timetable" className="inline-block mt-3 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#155e75,#06b6d4)' }}>Open Timetable →</a>
    </div>
  );
}

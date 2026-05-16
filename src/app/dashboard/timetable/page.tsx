'use client';
import { useState } from 'react';
import { TimetableProvider, useTimetable } from './TimetableProvider';
import type { TTab } from './timetable-types';
import {
  FiGrid, FiList, FiCalendar, FiMapPin, FiZap, FiEdit3,
  FiEye, FiUser, FiColumns, FiCheckCircle, FiRepeat,
  FiBarChart2, FiPrinter, FiSettings, FiX, FiHome
} from 'react-icons/fi';

// Tab imports
import DashboardTab from './DashboardTab';
import CardsTab from './CardsTab';
import GenerateTab from './GenerateTab';
import EditorTab from './EditorTab';
import { ClassViewTab, TeacherViewTab, RoomViewTab, MasterViewTab } from './ViewTabs';
import { VerifyTab, StatsTab, PrintTab } from './ToolsTabs1';
import { SetupTab, AvailabilityTab } from './SetupAvailTab';
import { ClassroomsTab, SubstitutionsTab } from './SubsClassroomTab';

// ═══════════════════════════════════════════════════════════════════
// ═══  APSIMS ULTRA TIMETABLE — MAIN PAGE  ════════════════════════
// ═══════════════════════════════════════════════════════════════════

function TimetableShell() {
  const { tab, setTab, loading, bTerm, setBTerm, bYear, setBYear } = useTimetable();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const NAV_GROUPS = [
    { label: '', items: [{ key: 'dashboard' as TTab, label: 'Dashboard', icon: FiHome, emoji: '📊' }] },
    { label: 'DATA INPUT', items: [
      { key: 'cards' as TTab, label: 'Lesson Cards', icon: FiList, emoji: '📋' },
      { key: 'availability' as TTab, label: 'Availability', icon: FiCalendar, emoji: '👨‍🏫' },
      { key: 'classrooms' as TTab, label: 'Classrooms', icon: FiMapPin, emoji: '🏫' },
    ]},
    { label: 'GENERATE', items: [
      { key: 'generate' as TTab, label: 'Auto Generate', icon: FiZap, emoji: '⚡' },
      { key: 'editor' as TTab, label: 'Manual Editor', icon: FiEdit3, emoji: '✏️' },
    ]},
    { label: 'VIEW', items: [
      { key: 'class' as TTab, label: 'Class View', icon: FiEye, emoji: '📅' },
      { key: 'teacher' as TTab, label: 'Teacher View', icon: FiUser, emoji: '👤' },
      { key: 'room' as TTab, label: 'Room View', icon: FiMapPin, emoji: '🚪' },
      { key: 'master' as TTab, label: 'Master Table', icon: FiColumns, emoji: '📋' },
    ]},
    { label: 'TOOLS', items: [
      { key: 'verify' as TTab, label: 'Verification', icon: FiCheckCircle, emoji: '✅' },
      { key: 'substitutions' as TTab, label: 'Substitutions', icon: FiRepeat, emoji: '🔄' },
      { key: 'stats' as TTab, label: 'Statistics', icon: FiBarChart2, emoji: '📊' },
      { key: 'print' as TTab, label: 'Print Center', icon: FiPrinter, emoji: '🖨️' },
      { key: 'setup' as TTab, label: 'Period Setup', icon: FiSettings, emoji: '⚙️' },
    ]},
  ];

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-5">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <FiGrid className="text-blue-500" size={20} />
          </div>
        </div>
        <p className="text-gray-500 font-bold text-sm">Loading APSIMS Timetable...</p>
        <p className="text-gray-400 text-xs mt-1">Fetching schedules, teachers & requirements</p>
      </div>
    </div>
  );

  return (
    <div className="flex gap-0 -m-4 lg:-m-6 min-h-[calc(100vh-80px)]">
      {/* ═══ ULTRA SIDEBAR ═══ */}
      <aside className={`${sidebarCollapsed ? 'w-[56px]' : 'w-[220px]'} flex-shrink-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 transition-all duration-300 overflow-y-auto hidden lg:flex flex-col`}>
        {/* Logo */}
        <div className={`px-3 py-4 border-b border-slate-700/50 flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          {!sidebarCollapsed && (
            <>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                <FiGrid className="text-white" size={17} />
              </div>
              <div>
                <h2 className="text-sm font-black text-white leading-tight tracking-tight">APSIMS Timetable</h2>
                <p className="text-[9px] text-slate-400 font-medium">Ultra Smart Scheduler</p>
              </div>
            </>
          )}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className={`${sidebarCollapsed ? '' : 'ml-auto'} text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50`}>
            {sidebarCollapsed ? <FiGrid size={18} /> : <FiX size={14} />}
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.label && !sidebarCollapsed && (
                <p className="px-2 pt-4 pb-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest">{group.label}</p>
              )}
              {group.label && sidebarCollapsed && <div className="border-t border-slate-700/50 my-2 mx-1" />}
              {group.items.map(item => (
                <button key={item.key} onClick={() => setTab(item.key)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] font-medium transition-all duration-200 ${
                    tab === item.key
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                  } ${sidebarCollapsed ? 'justify-center' : ''}`}
                  title={sidebarCollapsed ? item.label : undefined}>
                  <span className="text-sm flex-shrink-0">{item.emoji}</span>
                  {!sidebarCollapsed && <span className="truncate font-semibold">{item.label}</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Term Selector */}
        {!sidebarCollapsed && (
          <div className="p-3 border-t border-slate-700/50 space-y-2">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-1">Academic Period</p>
            <select value={bTerm} onChange={e => setBTerm(e.target.value)} className="w-full px-2.5 py-2 bg-slate-800 border border-slate-600 rounded-xl text-xs text-white font-medium focus:border-blue-400 outline-none">
              {['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={bYear} onChange={e => setBYear(Number(e.target.value))} className="w-full px-2.5 py-2 bg-slate-800 border border-slate-600 rounded-xl text-xs text-white font-medium focus:border-blue-400 outline-none">
              {[bYear - 1, bYear, bYear + 1].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
      </aside>

      {/* ═══ MOBILE TAB BAR ═══ */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-gray-200 shadow-2xl flex overflow-x-auto px-1 py-1.5">
        {NAV_GROUPS.flatMap(g => g.items).slice(0, 7).map(item => (
          <button key={item.key} onClick={() => setTab(item.key)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[9px] font-bold min-w-[58px] transition-all ${tab === item.key ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}>
            <span className="text-lg">{item.emoji}</span>
            <span className="truncate">{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="flex-1 bg-[#f0f4f8] overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
        {/* Mobile term selector */}
        <div className="lg:hidden flex gap-2 mb-4">
          <select value={bTerm} onChange={e => setBTerm(e.target.value)} className="px-3 py-2 border rounded-xl text-sm bg-white flex-1 font-medium">{['Term 1', 'Term 2', 'Term 3'].map(t => <option key={t}>{t}</option>)}</select>
          <select value={bYear} onChange={e => setBYear(Number(e.target.value))} className="px-3 py-2 border rounded-xl text-sm bg-white font-medium">{[bYear - 1, bYear, bYear + 1].map(y => <option key={y} value={y}>{y}</option>)}</select>
        </div>

        {/* Tab Content */}
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'cards' && <CardsTab />}
        {tab === 'availability' && <AvailabilityTab />}
        {tab === 'classrooms' && <ClassroomsTab />}
        {tab === 'generate' && <GenerateTab />}
        {tab === 'editor' && <EditorTab />}
        {tab === 'class' && <ClassViewTab />}
        {tab === 'teacher' && <TeacherViewTab />}
        {tab === 'room' && <RoomViewTab />}
        {tab === 'master' && <MasterViewTab />}
        {tab === 'verify' && <VerifyTab />}
        {tab === 'substitutions' && <SubstitutionsTab />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'print' && <PrintTab />}
        {tab === 'setup' && <SetupTab />}
      </main>
    </div>
  );
}

export default function TimetablePage() {
  return (
    <TimetableProvider>
      <TimetableShell />
    </TimetableProvider>
  );
}

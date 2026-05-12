'use client';

import { useUltraCBCMarks } from '@/hooks/useUltraCBCMarks';
import UltraCBCAnalyticsPanel from '@/components/cbc/UltraCBCAnalyticsPanel';
import UltraCBCStudentRow from '@/components/cbc/UltraCBCStudentRow';
import { UltraCBCFilterBar, UltraCBCProgressStrip, UltraCBCBulkBar } from '@/components/cbc/UltraCBCFilterBar';
import {
  FiDownload,
  FiSave,
  FiCheckCircle,
  FiFileText,
  FiSettings,
  FiCheck,
  FiClipboard,
  FiBarChart2,
  FiAward,
  FiClock,
  FiEdit3,
  FiBook,
  FiUsers,
  FiUpload,
  FiPrinter,
  FiCpu,
  FiList,
  FiStar,
  FiLayers,
} from 'react-icons/fi';

// ---------------------------------------------------------------------------
// Trend Data (static demo — replace with real data when available)
// ---------------------------------------------------------------------------
const TREND_DATA = [
  { label: 'F1', value: 40, color: '#1D9E75' },
  { label: 'F2', value: 65, color: '#378ADD' },
  { label: 'F3', value: 52, color: '#EF9F27' },
  { label: 'F4', value: 78, color: '#1D9E75' },
  { label: 'S1', value: 45, color: '#E24B4A' },
  { label: 'S2', value: 60, color: '#378ADD' },
];

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function CBCMarksPage() {
  const hook = useUltraCBCMarks();

  // ── Loading state ──
  if (hook.loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div
            className="w-10 h-10 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3"
            style={{ borderWidth: 3, borderStyle: 'solid' }}
          />
          <p className="text-gray-400 text-sm">Loading Ultra CBC Assessment System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* ================================================================= */}
      {/* Confirm Overwrite Dialog                                          */}
      {/* ================================================================= */}
      {hook.showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-800 mb-2">
              Overwrite Summative Assessment?
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              A summative assessment already exists for this subject and term.
              Saving will overwrite the existing records. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  hook.setShowConfirm(false);
                  hook.setPendingSave(null);
                }}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  hook.setShowConfirm(false);
                  if (hook.pendingSave) await hook.pendingSave();
                  hook.setPendingSave(null);
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600"
              >
                Overwrite
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Top Bar                                                           */}
      {/* ================================================================= */}
      <div className="flex items-center justify-between py-2.5 px-5 bg-white border-b border-gray-200 sticky top-0 z-40">
        {/* Left: Logo + Breadcrumb */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #6C63FF, #00D9A6)' }}
            >
              <FiBook size={14} className="text-white" />
            </div>
            AlphaSIMS
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Exams</span>
            <span className="opacity-50">›</span>
            <span>CBC Assessment</span>
            <span className="opacity-50">›</span>
            <span className="text-gray-700 font-medium">Mark Entry</span>
          </div>
        </div>

        {/* Center: Nav Tabs */}
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
          {[
            { id: 'entry', label: 'Mark Entry', icon: FiEdit3 },
            { id: 'summary', label: 'Summary', icon: FiBarChart2 },
            { id: 'competency', label: 'Competency', icon: FiAward },
            { id: 'history', label: 'History', icon: FiClock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === 'entry';
            return (
              <button
                key={tab.id}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-white text-gray-800 font-semibold shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={12} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={hook.exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer"
          >
            <FiDownload size={13} />
            Export
          </button>
          <button
            onClick={() => hook.triggerSave(false)}
            disabled={hook.saving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60"
            style={{ background: hook.saving ? '#1D9E75' : '#00D9A6', borderColor: '#00D9A6' }}
          >
            {hook.saving ? (
              <>
                <FiCheck size={13} />
                Saving...
              </>
            ) : (
              <>
                <FiSave size={13} />
                Save All
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Content Area: Sidebar + Main + Analytics Panel                    */}
      {/* ================================================================= */}
      <div className="flex" style={{ minHeight: 'calc(100vh - 180px)' }}>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Left Sidebar                                                   */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div className="w-[200px] flex-shrink-0 bg-white border-r border-gray-200 py-4 px-3 flex flex-col gap-1">
          {/* Navigation items */}
          {[
            { icon: FiEdit3, label: 'Mark Entry', active: true },
            { icon: FiUsers, label: 'Students', badge: String(hook.totalStudents || 0) },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 py-2 px-2 rounded-md text-xs cursor-pointer transition-all ${
                item.active
                  ? 'bg-gray-100 text-gray-800 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <item.icon size={14} className="opacity-70" />
              {item.label}
              {item.badge && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] text-white font-medium" style={{ background: '#6C63FF' }}>
                  {item.badge}
                </span>
              )}
            </div>
          ))}

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pt-3 pb-1">
            Subjects
          </div>
          {[
            { icon: FiBook, label: 'English' },
            { icon: FiLayers, label: 'Mathematics' },
            { icon: FiCpu, label: 'Science' },
            { icon: FiList, label: 'Social Studies' },
            { icon: FiStar, label: 'Creative Arts' },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 py-2 px-2 rounded-md text-xs cursor-pointer transition-all ${
                i === 0
                  ? 'bg-gray-100 text-gray-800 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`}
            >
              <item.icon size={14} className="opacity-70" />
              {item.label}
            </div>
          ))}

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pt-3 pb-1">
            Assessments
          </div>
          {[
            { icon: FiClipboard, label: 'Formative', badge: '3', badgeBg: '#E6F1FB', badgeColor: '#185FA5' },
            { icon: FiCheckCircle, label: 'Summative', badge: '1', badgeBg: '#E1F5EE', badgeColor: '#0F6E56' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-2 px-2 rounded-md text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 cursor-pointer transition-all">
              <item.icon size={14} className="opacity-70" />
              {item.label}
              <span
                className="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-medium"
                style={{ background: item.badgeBg, color: item.badgeColor }}
              >
                {item.badge}
              </span>
            </div>
          ))}

          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 pt-3 pb-1">
            Tools
          </div>
          {[
            { icon: FiUpload, label: 'Bulk Import' },
            { icon: FiPrinter, label: 'Print Report' },
            { icon: FiCpu, label: 'AI Insights' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-2 px-2 rounded-md text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700 cursor-pointer transition-all">
              <item.icon size={14} className="opacity-70" />
              {item.label}
            </div>
          ))}
        </div>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Main Content Area                                              */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Header + Filters */}
          <div className="py-4 px-5 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-gray-800 flex items-center gap-2.5">
                  <FiClipboard size={20} className="text-indigo-500" />
                  CBC Mark Entry — {hook.subjectName || 'Select Subject'}
                  <span className="text-[10px] py-0.5 px-2 rounded border border-gray-200 bg-gray-50 text-gray-500 font-medium ml-1">
                    {hook.selAssessmentType} Assessment
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter rubric levels and marks. Rubric auto-selects from score.{' '}
                  {hook.termName && `${hook.termName}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={hook.toggleBulk}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    hook.bulkMode
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <FiCheckCircle size={13} />
                  Bulk Select
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer" style={{ background: '#6C63FF' }}>
                  <FiSettings size={13} />
                  Rubric Config
                </button>
              </div>
            </div>

            <UltraCBCFilterBar
              forms={hook.forms}
              streams={hook.streams}
              subjects={hook.availableSubjects}
              terms={hook.terms}
              selForm={hook.selForm}
              selStream={hook.selStream}
              selSubject={hook.selSubject}
              selTerm={hook.selTerm}
              selAssessmentType={hook.selAssessmentType}
              searchQuery={hook.searchQuery}
              rubricFilter={hook.rubricFilter}
              taskName={hook.taskName}
              onFormChange={hook.setSelForm}
              onStreamChange={hook.setSelStream}
              onSubjectChange={hook.setSelSubject}
              onTermChange={hook.setSelTerm}
              onAssessmentTypeChange={hook.setSelAssessmentType}
              onSearchChange={hook.setSearchQuery}
              onRubricFilterChange={hook.setRubricFilter}
              onTaskNameChange={hook.setTaskName}
            />
          </div>

          {/* Progress Strip */}
          {hook.isReady && hook.totalStudents > 0 && (
            <UltraCBCProgressStrip
              counts={hook.analyticsCounts}
              totalStudents={hook.totalStudents}
              completionPct={hook.completionPct}
            />
          )}

          {/* Bulk Selection Bar */}
          <UltraCBCBulkBar
            bulkMode={hook.bulkMode}
            selectedCount={hook.selected.size}
            onSelectAll={hook.handleSelectAll}
            onBulkSet={hook.handleBulkSet}
            onClearSelected={hook.handleClearSelected}
          />

          {/* Table or Empty State */}
          {!hook.isReady ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center py-20 text-gray-400">
                <span className="text-5xl block mb-4">📝</span>
                <p className="font-semibold text-lg">Select all required filters to enter marks</p>
                <p className="text-xs mt-1">
                  Form, Subject, Term, Assessment Type
                  {hook.selAssessmentType === 'Formative' ? ', and Task Name' : ''} are required
                </p>
              </div>
            </div>
          ) : hook.filteredStudents.length === 0 ? (
            <div className="flex-1 flex items-center justify-center bg-white">
              <div className="text-center py-20 text-gray-400">
                <span className="text-5xl block mb-4">👥</span>
                <p className="font-semibold">No students found</p>
                <p className="text-xs mt-1">Try adjusting your filters or search query</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr>
                    {hook.bulkMode && <th className="px-3 py-2 text-left w-9" />}
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-7">
                      #
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Marks <span className="text-gray-300 font-normal">/100</span>
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Rubric Level
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Current
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Prev Term
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Trend
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Form. Avg
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                      Teacher Note
                    </th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider w-[80px]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hook.filteredStudents.map((student: any, idx: number) => (
                    <UltraCBCStudentRow
                      key={student.id}
                      student={{
                        id: student.id,
                        admNo: student.admission_no || student.admission_number || '—',
                        firstName: student.first_name,
                        lastName: student.last_name,
                        gender: student.gender || '',
                        stream: String(student.stream_id || ''),
                        streamName: '',
                      }}
                      index={idx + 1}
                      score={hook.markScores[student.id] || ''}
                      level={hook.markLevels[student.id] || null}
                      prevLevel={hook.prevTermLevels[student.id] || null}
                      formativeAvgLevel={hook.formativeAvgLevels[student.id] || null}
                      note={hook.markNotes[student.id] || ''}
                      bulkMode={hook.bulkMode}
                      isSelected={hook.selected.has(student.id)}
                      onScoreChange={hook.handleScoreChange}
                      onLevelChange={hook.handleLevelChange}
                      onClear={hook.handleClear}
                      onNoteChange={hook.handleNoteChange}
                      onCheckChange={hook.handleCheckChange}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────── */}
        {/* Right Analytics Panel                                          */}
        {/* ─────────────────────────────────────────────────────────────── */}
        <UltraCBCAnalyticsPanel
          totalStudents={hook.totalStudents}
          marks={hook.markLevels as Record<number, string | null>}
          scores={hook.markScores}
          rubricConfig={hook.rubricConfig}
          subjectName={hook.subjectName}
          termName={hook.termName}
          deadlineDays={3}
          beStudentNames={hook.beStudentNames}
          trendData={TREND_DATA}
        />
      </div>
    </div>
  );
}

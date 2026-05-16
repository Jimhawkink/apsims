'use client';
import { useState } from 'react';
import { useTimetable } from './TimetableProvider';
import { getSubjectColor } from './timetable-colors';
import type { GenSettings, UnplacedCard, Entry } from './timetable-types';
import { FiZap, FiSliders, FiEye, FiAlertTriangle, FiCheckCircle, FiCpu, FiActivity } from 'react-icons/fi';

export default function GenerateTab() {
  const ctx = useTimetable();
  const { termReqs, termEntries, lessonPeriods, subjects, setTab, handleGenerate, bTerm, bYear,
    getSubjectName, getFormName, getStreamName } = ctx;

  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genResults, setGenResults] = useState<{ placed: Entry[]; unplaced: UnplacedCard[] } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GenSettings>({
    maxConsecutiveSameSubject: 2, spreadEvenly: true,
    avoidLastPeriod: [], maxTeacherLessonsPerDay: 7
  });

  const totalLessons = termReqs.reduce((s, r) => s + r.lessons_per_week, 0);
  const totalClasses = new Set(termReqs.map(r => `${r.form_id}-${r.stream_id}`)).size;
  const slotsPerClass = lessonPeriods.length * 5;

  const doGenerate = async () => {
    setGenerating(true); setGenProgress(0); setGenResults(null);
    setGenProgress(15);
    await new Promise(r => setTimeout(r, 300));
    setGenProgress(30);
    const result = await handleGenerate(settings);
    setGenProgress(70);
    await new Promise(r => setTimeout(r, 200));
    setGenProgress(100);
    if (result) setGenResults(result);
    setGenerating(false);
  };

  return (
    <div className="space-y-5">
      {/* Hero Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-7 text-white">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-40 translate-x-40 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full translate-y-30 -translate-x-30 blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <FiCpu size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">Auto-Generate Engine</h2>
              <p className="text-indigo-200 text-sm">AI-powered constraint-based scheduling • {bTerm} {bYear}</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
            {[
              { v: termReqs.length, l: 'Subject Cards', icon: '📋' },
              { v: totalLessons, l: 'Total Lessons', icon: '📖' },
              { v: totalClasses, l: 'Classes', icon: '🏫' },
              { v: slotsPerClass, l: 'Slots / Class', icon: '📊' },
            ].map((s, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center border border-white/10 hover:bg-white/15 transition-colors">
                <p className="text-2xl mb-1">{s.icon}</p>
                <p className="text-2xl font-black">{s.v}</p>
                <p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wide">{s.l}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 items-center flex-wrap">
            <button onClick={doGenerate} disabled={generating || termReqs.length === 0}
              className="px-8 py-3.5 bg-white text-indigo-700 rounded-xl text-sm font-black shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center gap-2.5">
              {generating ? (
                <><div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-700 rounded-full animate-spin" /> Generating...</>
              ) : (
                <><FiZap size={18} /> Generate Timetable</>
              )}
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className="px-5 py-3.5 bg-white/10 backdrop-blur-sm rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-white/20 border border-white/20 transition-all">
              <FiSliders size={16} /> Constraints
            </button>
            {termReqs.length === 0 && (
              <button onClick={() => setTab('cards')} className="px-5 py-3.5 bg-amber-400/20 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-400/30">
                <FiAlertTriangle size={16} /> Add Cards First
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {generating && (
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="flex items-center gap-2"><FiActivity size={14} className="animate-pulse" /> Processing constraints...</span>
                <span className="font-bold">{genProgress}%</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                <div className="h-full bg-gradient-to-r from-emerald-400 via-green-400 to-teal-400 rounded-full transition-all duration-500 shadow-lg shadow-emerald-500/30" style={{ width: `${genProgress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2 text-sm"><FiSliders className="text-blue-500" /> Generation Constraints</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Max Consecutive Same Subject</label>
              <input type="number" min={1} max={4} value={settings.maxConsecutiveSameSubject} onChange={e => setSettings({ ...settings, maxConsecutiveSameSubject: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none" />
              <p className="text-[9px] text-gray-400 mt-1">Prevents monotony — Kenya MoE recommends 2</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Max Teacher Lessons/Day</label>
              <input type="number" min={3} max={10} value={settings.maxTeacherLessonsPerDay} onChange={e => setSettings({ ...settings, maxTeacherLessonsPerDay: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none" />
              <p className="text-[9px] text-gray-400 mt-1">TSC guideline: 6–8 lessons per day</p>
            </div>
            <div className="flex items-start gap-3 pt-5">
              <input type="checkbox" checked={settings.spreadEvenly} onChange={e => setSettings({ ...settings, spreadEvenly: e.target.checked })} className="w-5 h-5 rounded-lg mt-0.5" id="se" />
              <label htmlFor="se"><span className="text-sm font-bold text-gray-700 block">Spread Evenly</span><span className="text-[10px] text-gray-400">Distribute same subject across all 5 days</span></label>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {genResults && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-6 border-2 ${genResults.unplaced.length === 0 ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'}`}>
            <h3 className={`font-black text-xl mb-4 flex items-center gap-2 ${genResults.unplaced.length === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
              {genResults.unplaced.length === 0 ? <><FiCheckCircle size={22} /> Perfect Generation!</> : <><FiAlertTriangle size={22} /> Partial Generation</>}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <p className="text-3xl font-black text-emerald-600">{genResults.placed.length}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Placed ✅</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <p className="text-3xl font-black text-red-500">{genResults.unplaced.reduce((s, u) => s + u.remaining, 0)}</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Unplaced ❌</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                <p className="text-3xl font-black text-blue-600">{Math.round(genResults.placed.length / Math.max(1, genResults.placed.length + genResults.unplaced.reduce((s, u) => s + u.remaining, 0)) * 100)}%</p>
                <p className="text-[10px] text-gray-500 uppercase font-bold mt-1">Success Rate</p>
              </div>
            </div>
          </div>

          {genResults.unplaced.length > 0 && (
            <div className="bg-white rounded-2xl border-2 border-red-100 overflow-hidden">
              <div className="p-4 border-b bg-red-50/50 flex items-center gap-2">
                <FiAlertTriangle className="text-red-500" size={16} />
                <h3 className="font-bold text-red-800 text-sm">Unplaced Cards ({genResults.unplaced.reduce((s, u) => s + u.remaining, 0)})</h3>
              </div>
              <div className="divide-y divide-red-50">
                {genResults.unplaced.map((u, i) => {
                  const color = getSubjectColor(u.req.subject_id, subjects);
                  return (
                    <div key={i} className="p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black" style={{ background: color.bg, color: color.text, border: `2px solid ${color.border}` }}>{u.remaining}</div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">{getSubjectName(u.req.subject_id)} — {getFormName(u.req.form_id)} {getStreamName(u.req.stream_id)}</p>
                        <p className="text-xs text-gray-500">{u.reason}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={() => setTab('class')} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all">
            <FiEye size={16} /> View Generated Timetable
          </button>
        </div>
      )}
    </div>
  );
}

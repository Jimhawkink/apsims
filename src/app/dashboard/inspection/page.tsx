'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiCheckCircle, FiAlertCircle, FiRefreshCw, FiChevronDown, FiChevronRight, FiDownload } from 'react-icons/fi';

const INSPECTION_AREAS = [
  { area: 'Administration & Management', emoji: '🏢', items: [
    'School development plan (SDP) updated','Staff meetings minutes (last 3 months)','School calendar displayed','Visitor book maintained','Timetable current and displayed','Notice board updated','Correspondence files organized','School standing orders available',
  ]},
  { area: 'Curriculum & Academics', emoji: '📚', items: [
    'Schemes of work (all subjects, all classes)','Lesson plans (checked by HODs)','Syllabus coverage records','Class registers up to date','Mark books (all teachers)','Continuous Assessment Records','CBC portfolio evidence','KNEC exam records and results',
  ]},
  { area: 'Staffing & HR', emoji: '👨‍🏫', items: [
    'Staff establishment list','Leave records and approvals','TSC letters for all teachers','Performance appraisal records','Staff attendance register','Non-teaching staff records','Teacher qualification certificates','Staff duty roster',
  ]},
  { area: 'Finance & Accounts', emoji: '💰', items: [
    'Approved budget','Fee collection receipts','Expenditure vouchers and approvals','Bank statements (reconciled)','Petty cash book','Assets register','Audit report (last year)','Bursary and scholarship records',
  ]},
  { area: 'Student Affairs', emoji: '🎓', items: [
    'Admission register','NEMIS records up to date','Attendance register (daily)','Discipline register','Health records','Guidance and counselling register','Student council records','Games and sports records',
  ]},
  { area: 'Infrastructure & Facilities', emoji: '🏫', items: [
    'Classrooms adequate and maintained','Library stocked and operational','Science laboratories equipped','Sanitation facilities adequate','Safe water supply','Kitchen and dining hall standards','Dormitories (boarding schools)','Playground and sports facilities',
  ]},
  { area: 'Health & Safety', emoji: '🏥', items: [
    'First aid kit available and stocked','School clinic/sickbay operational','Fire extinguishers present','Emergency evacuation plan displayed','COVID/health protocols displayed','Kitchen health standards met','Safe food handling records','Accident register maintained',
  ]},
  { area: 'Community & Parents', emoji: '🤝', items: [
    'Parents Association (PA) meetings minutes','BOG/SMC meeting minutes and resolutions','Parent involvement records','Community service records','School-community partnership records','Parent communication records',
  ]},
];

export default function InspectionPage() {
  const [checklist, setChecklist] = useState<Record<string,boolean>>({});
  const [notes, setNotes] = useState<Record<string,string>>({});
  const [expanded, setExpanded] = useState<Record<string,boolean>>({ 'Administration & Management': true });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string|null>(null);

  useEffect(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem('apsims_inspection_checklist');
      if (saved) setChecklist(JSON.parse(saved));
      const savedNotes = localStorage.getItem('apsims_inspection_notes');
      if (savedNotes) setNotes(JSON.parse(savedNotes));
      const ts = localStorage.getItem('apsims_inspection_saved');
      if (ts) setLastSaved(ts);
    } catch {}
  }, []);

  const toggleItem = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveProgress = () => {
    setSaving(true);
    try {
      localStorage.setItem('apsims_inspection_checklist', JSON.stringify(checklist));
      localStorage.setItem('apsims_inspection_notes', JSON.stringify(notes));
      const ts = new Date().toLocaleString('en-KE');
      localStorage.setItem('apsims_inspection_saved', ts);
      setLastSaved(ts);
      toast.success('✅ Progress saved!');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const resetAll = () => {
    if (!confirm('Reset ALL checklist items? This cannot be undone.')) return;
    setChecklist({}); setNotes({});
    localStorage.removeItem('apsims_inspection_checklist');
    localStorage.removeItem('apsims_inspection_notes');
    toast.success('Checklist reset');
  };

  // Compute scores
  const totalItems = INSPECTION_AREAS.reduce((s, a) => s + a.items.length, 0);
  const doneItems = Object.values(checklist).filter(Boolean).length;
  const overallPct = Math.round(doneItems / totalItems * 100);
  const areaScores = INSPECTION_AREAS.map(a => {
    const done = a.items.filter(item => checklist[`${a.area}|${item}`]).length;
    return { ...a, done, pct: Math.round(done / a.items.length * 100) };
  });

  const scoreColor = overallPct >= 80 ? '#16a34a' : overallPct >= 60 ? '#d97706' : '#dc2626';
  const scoreLabel = overallPct >= 80 ? 'READY ✅' : overallPct >= 60 ? 'PARTIAL ⚠️' : 'NOT READY ❌';

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: `linear-gradient(135deg,#0f172a,#1e293b,${scoreColor.replace('#','#')}30)` }}>
        <div className="px-6 py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="3.5"
                  strokeDasharray={`${overallPct} 100`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white">{overallPct}%</span>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Inspection Readiness</h1>
              <p className="text-xl font-black mt-0.5" style={{ color: scoreColor }}>{scoreLabel}</p>
              <p className="text-gray-400 text-sm mt-1">{doneItems}/{totalItems} items completed · {INSPECTION_AREAS.length} inspection areas</p>
              {lastSaved && <p className="text-gray-500 text-xs mt-0.5">Last saved: {lastSaved}</p>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={saveProgress} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm font-bold transition disabled:opacity-60">
              {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheckCircle size={14} />} Save Progress
            </button>
            <button onClick={resetAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-sm font-bold hover:bg-white/20 transition">
              Reset All
            </button>
          </div>
        </div>

        {/* Area progress bars */}
        <div className="px-6 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {areaScores.map(a => (
              <div key={a.area} className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-base">{a.emoji}</span>
                  <span className="text-[10px] font-black text-white">{a.pct}%</span>
                </div>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-1">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${a.pct}%`, background: a.pct>=80?'#22c55e':a.pct>=60?'#f59e0b':'#ef4444' }} />
                </div>
                <p className="text-[9px] text-white/70 leading-tight truncate">{a.area}</p>
                <p className="text-[9px] text-white/50">{a.done}/{a.items.length}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Checklist areas */}
      <div className="space-y-3">
        {areaScores.map(a => (
          <div key={a.area} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <button className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/80 transition"
              onClick={() => setExpanded(prev => ({ ...prev, [a.area]: !prev[a.area] }))}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{a.emoji}</span>
                <div className="text-left">
                  <p className="font-black text-gray-800">{a.area}</p>
                  <p className="text-xs text-gray-500">{a.done}/{a.items.length} items · {a.pct}% ready</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 rounded-full transition-all" style={{ width: `${a.pct}%`, background: a.pct>=80?'#22c55e':a.pct>=60?'#f59e0b':'#ef4444' }} />
                </div>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${a.pct>=80?'bg-green-100 text-green-700':a.pct>=60?'bg-amber-100 text-amber-700':'bg-red-100 text-red-600'}`}>
                  {a.pct>=80?'Ready':a.pct>=60?'Partial':'Missing'}
                </span>
                {expanded[a.area] ? <FiChevronDown size={16} className="text-gray-400" /> : <FiChevronRight size={16} className="text-gray-400" />}
              </div>
            </button>

            {expanded[a.area] && (
              <div className="border-t border-gray-50 divide-y divide-gray-50">
                {a.items.map((item, i) => {
                  const key = `${a.area}|${item}`;
                  const done = !!checklist[key];
                  return (
                    <div key={i} className={`px-5 py-3 flex items-start gap-3 group transition ${done ? 'bg-green-50/30' : 'hover:bg-gray-50/50'}`}>
                      <button onClick={() => toggleItem(key)}
                        className={`w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition border-2 ${done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}>
                        {done && <FiCheckCircle size={12} />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{item}</p>
                        <input value={notes[key] || ''} onChange={e => setNotes(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="Add note (optional)…"
                          className="text-[10px] text-gray-400 bg-transparent outline-none mt-0.5 w-full italic focus:not-italic focus:text-gray-600 placeholder-gray-300" />
                      </div>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0 ${done ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                        {done ? '✅' : '❌'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Print Report */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-gray-800">📊 Inspection Readiness Report</h3>
            <p className="text-sm text-gray-500 mt-0.5">Download a full report of your readiness status for MOEST/TSC/QAASO inspection</p>
          </div>
          <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
            <FiDownload size={14} /> Print Report
          </button>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {areaScores.map(a => (
            <div key={a.area} className={`rounded-xl p-3 ${a.pct>=80?'bg-green-50 border border-green-200':a.pct>=60?'bg-amber-50 border border-amber-200':'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{a.emoji}</span>
                <span className={`text-[9px] font-black ${a.pct>=80?'text-green-700':a.pct>=60?'text-amber-700':'text-red-600'}`}>{a.pct}%</span>
              </div>
              <p className="text-[10px] font-bold text-gray-700 leading-tight">{a.area}</p>
              <p className="text-[9px] text-gray-500">{a.done}/{a.items.length} items</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

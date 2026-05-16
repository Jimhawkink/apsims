'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useTimetable } from './TimetableProvider';
import { getSubjectColor } from './timetable-colors';
import { FiPlus, FiTrash2, FiSave, FiChevronDown, FiChevronUp, FiCopy, FiList, FiTarget, FiLayers } from 'react-icons/fi';

export default function CardsTab() {
  const ctx = useTimetable();
  const { forms, streams, subjects, teachers, requirements, termEntries, termReqs, lessonPeriods, totalAvailableSlots,
    fetchAll, bTerm, bYear, getSubjectName, getSubjectCode, getTeacherName, getFormName, getStreamName } = ctx;

  const [reqForm, setReqForm] = useState(forms[0]?.id ? String(forms[0].id) : '');
  const [reqStream, setReqStream] = useState(streams[0]?.id ? String(streams[0].id) : '');
  const [showAddReq, setShowAddReq] = useState(false);
  const [newReqSubject, setNewReqSubject] = useState('');
  const [newReqTeacher, setNewReqTeacher] = useState('');
  const [newReqLessons, setNewReqLessons] = useState(3);
  const [newReqMaxPerDay, setNewReqMaxPerDay] = useState(2);
  const [savingReq, setSavingReq] = useState(false);

  const classRequirements = requirements.filter(r => r.form_id === Number(reqForm) && r.stream_id === Number(reqStream) && r.term === bTerm && r.year === bYear);
  const totalRequiredLessons = classRequirements.reduce((sum, r) => sum + r.lessons_per_week, 0);
  const capacityPct = totalAvailableSlots ? Math.round(totalRequiredLessons / totalAvailableSlots * 100) : 0;

  const handleAddRequirement = async () => {
    if (!newReqSubject || !reqForm || !reqStream) { toast.error('Select a subject'); return; }
    setSavingReq(true);
    const data = { form_id: Number(reqForm), stream_id: Number(reqStream), subject_id: Number(newReqSubject), teacher_id: newReqTeacher ? Number(newReqTeacher) : null, lessons_per_week: newReqLessons, max_per_day: newReqMaxPerDay, allow_double: false, term: bTerm, year: bYear };
    const { error } = await supabase.from('school_timetable_requirements').upsert([data], { onConflict: 'form_id,stream_id,subject_id,term,year' });
    if (error) toast.error(error.message);
    else { toast.success('Requirement saved'); setShowAddReq(false); setNewReqSubject(''); setNewReqTeacher(''); setNewReqLessons(3); }
    await fetchAll(); setSavingReq(false);
  };
  const handleDeleteRequirement = async (id: number) => { if (!confirm('Remove this subject requirement?')) return; await supabase.from('school_timetable_requirements').delete().eq('id', id); toast.success('Removed'); fetchAll(); };
  const handleUpdateReqLessons = async (req: any, n: number) => { if (n < 1 || n > 10) return; await supabase.from('school_timetable_requirements').update({ lessons_per_week: n }).eq('id', req.id); fetchAll(); };
  const handleUpdateReqTeacher = async (req: any, tid: string) => { await supabase.from('school_timetable_requirements').update({ teacher_id: tid ? Number(tid) : null }).eq('id', req.id); fetchAll(); };
  const handleCopyRequirements = async () => {
    if (!confirm(`Copy all requirements from ${getFormName(Number(reqForm))} ${getStreamName(Number(reqStream))} to all other streams?`)) return;
    if (!classRequirements.length) { toast.error('No requirements'); return; }
    const tgt = streams.filter(s => String(s.id) !== reqStream);
    let c = 0;
    for (const s of tgt) { for (const r of classRequirements) { await supabase.from('school_timetable_requirements').upsert([{ form_id: r.form_id, stream_id: s.id, subject_id: r.subject_id, teacher_id: null, lessons_per_week: r.lessons_per_week, max_per_day: r.max_per_day, allow_double: r.allow_double, term: bTerm, year: bYear }], { onConflict: 'form_id,stream_id,subject_id,term,year' }); c++; } }
    toast.success(`Copied ${c} requirements`); fetchAll();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">📋 Lesson Cards</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define lessons per week for each subject & class — ASC-style cards</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form / Grade</label>
            <select value={reqForm} onChange={e => setReqForm(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none font-medium bg-white min-w-[130px]">{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Stream</label>
            <select value={reqStream} onChange={e => setReqStream(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none font-medium bg-white min-w-[130px]">{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select>
          </div>
          <div className="flex-1" />

          {/* Capacity Gauge */}
          <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200">
            <div className="relative w-10 h-10">
              <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                <circle cx="18" cy="18" r="14" fill="none" stroke={capacityPct > 100 ? '#ef4444' : capacityPct > 80 ? '#f59e0b' : '#22c55e'} strokeWidth="3" strokeDasharray={`${Math.min(capacityPct, 100) * 0.88} 88`} strokeLinecap="round" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-gray-700">{capacityPct}%</span>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700">{totalRequiredLessons}<span className="text-gray-400 font-normal">/{totalAvailableSlots}</span></p>
              <p className="text-[9px] text-gray-500">Slots Used</p>
            </div>
            {capacityPct > 100 && <span className="text-red-600 font-bold text-xs animate-pulse">⚠️ OVER!</span>}
          </div>

          <button onClick={() => setShowAddReq(true)} className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            <FiPlus size={15} /> Add Subject
          </button>
          {classRequirements.length > 0 && (
            <button onClick={handleCopyRequirements} className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:border-blue-300 hover:bg-blue-50 transition-all">
              <FiCopy size={14} /> Copy to Streams
            </button>
          )}
        </div>
      </div>

      {/* Add Requirement Form */}
      {showAddReq && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-xl shadow-blue-500/5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><FiPlus className="text-blue-500" /> Add Subject for {getFormName(Number(reqForm))} {getStreamName(Number(reqStream))}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Subject *</label><select value={newReqSubject} onChange={e => setNewReqSubject(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none"><option value="">— Select —</option>{subjects.filter(s => !classRequirements.some(r => r.subject_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Teacher</label><select value={newReqTeacher} onChange={e => setNewReqTeacher(e.target.value)} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none"><option value="">— Any —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Lessons/Week</label><input type="number" min={1} max={10} value={newReqLessons} onChange={e => setNewReqLessons(Number(e.target.value))} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Max/Day</label><input type="number" min={1} max={4} value={newReqMaxPerDay} onChange={e => setNewReqMaxPerDay(Number(e.target.value))} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none" /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleAddRequirement} disabled={savingReq} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold hover:shadow-lg disabled:opacity-50 flex items-center gap-1.5 transition-all"><FiSave size={14} /> {savingReq ? 'Saving...' : 'Save Card'}</button>
            <button onClick={() => setShowAddReq(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">Cancel</button>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <FiLayers className="text-white" size={18} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800">{getFormName(Number(reqForm))} {getStreamName(Number(reqStream))}</h3>
              <p className="text-[10px] text-gray-500">{classRequirements.length} subjects • {totalRequiredLessons} lessons/week</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">{bTerm} {bYear}</span>
          </div>
        </div>

        {classRequirements.length === 0 ? (
          <div className="text-center py-16">
            <FiList size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="font-bold text-gray-400 text-lg">No Requirements Yet</p>
            <p className="text-sm text-gray-300 mt-1">Click "Add Subject" to start building the timetable</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {classRequirements.map(req => {
              const color = getSubjectColor(req.subject_id, subjects);
              const placed = termEntries.filter(e => e.form_id === req.form_id && e.stream_id === req.stream_id && e.subject_id === req.subject_id).length;
              const pct = Math.round(placed / req.lessons_per_week * 100);
              const isComplete = placed >= req.lessons_per_week;
              return (
                <div key={req.id} className="group relative rounded-2xl border-2 p-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1" style={{ borderColor: color.border, background: `linear-gradient(135deg, ${color.bg}, white)` }}>
                  {/* Top accent */}
                  <div className="absolute top-0 left-4 right-4 h-1 rounded-b-full" style={{ background: color.text }} />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4 mt-1">
                    <div>
                      <h4 className="font-black text-base leading-tight" style={{ color: color.text }}>{getSubjectName(req.subject_id)}</h4>
                      <p className="text-xs mt-1 font-bold opacity-60" style={{ color: color.text }}>{getSubjectCode(req.subject_id)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Progress Ring */}
                      <div className="relative w-12 h-12">
                        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
                          <circle cx="18" cy="18" r="14" fill="none" stroke={color.border} strokeWidth="2.5" opacity="0.3" />
                          <circle cx="18" cy="18" r="14" fill="none" stroke={isComplete ? '#22c55e' : color.text} strokeWidth="2.5" strokeDasharray={`${Math.min(pct, 100) * 0.88} 88`} strokeLinecap="round" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black" style={{ color: isComplete ? '#22c55e' : color.text }}>{placed}/{req.lessons_per_week}</span>
                      </div>
                      <button onClick={() => handleDeleteRequirement(req.id!)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"><FiTrash2 size={14} /></button>
                    </div>
                  </div>

                  {/* Lesson Counter */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex items-center gap-1.5 bg-white/70 rounded-xl px-3 py-2 border border-white/50 backdrop-blur-sm shadow-sm">
                      <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week - 1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><FiChevronDown size={12} /></button>
                      <span className="text-lg font-black min-w-[28px] text-center" style={{ color: color.text }}>{req.lessons_per_week}</span>
                      <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week + 1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><FiChevronUp size={12} /></button>
                      <span className="text-[10px] text-gray-500 font-bold ml-1">L/wk</span>
                    </div>
                    <div className="px-2.5 py-1.5 bg-white/70 rounded-xl text-[10px] font-bold backdrop-blur-sm border border-white/50" style={{ color: color.text }}>
                      <FiTarget size={10} className="inline mr-1" />max {req.max_per_day}/day
                    </div>
                    {isComplete && <div className="px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black">✅ Done</div>}
                  </div>

                  {/* Teacher Selector */}
                  <div>
                    <label className="text-[9px] font-bold uppercase text-gray-500 block mb-1.5">Assigned Teacher</label>
                    <select value={req.teacher_id || ''} onChange={e => handleUpdateReqTeacher(req, e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs border-2 border-white/50 bg-white/80 backdrop-blur-sm font-medium focus:border-blue-300 outline-none">
                      <option value="">— Any Available —</option>
                      {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                    </select>
                  </div>

                  {/* Placed indicator bar */}
                  <div className="mt-4">
                    <div className="h-1.5 bg-white/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%`, background: isComplete ? '#22c55e' : color.text }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

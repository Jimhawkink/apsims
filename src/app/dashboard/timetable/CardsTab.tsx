'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useTimetable } from './TimetableProvider';
import { getSubjectColor } from './timetable-colors';
import { FiPlus, FiTrash2, FiSave, FiChevronDown, FiChevronUp, FiCopy, FiList, FiTarget, FiLayers, FiZap, FiLink, FiAlertTriangle } from 'react-icons/fi';

export default function CardsTab() {
  const ctx = useTimetable();
  const { forms, streams, subjects, teachers, requirements, termEntries, termReqs, lessonPeriods, totalAvailableSlots,
    fetchAll, bTerm, bYear, getSubjectName, getSubjectCode, getTeacherName, getFormName, getStreamName,
    getAssignmentsForClass, getTeacherForSubjectClass, subjectTeachers } = ctx;

  const [reqForm, setReqForm] = useState(forms[0]?.id ? String(forms[0].id) : '');
  const [reqStream, setReqStream] = useState(streams[0]?.id ? String(streams[0].id) : '');
  const [autoFilling, setAutoFilling] = useState(false);

  const fId = Number(reqForm);
  const sId = Number(reqStream);

  const classRequirements = requirements.filter(r => r.form_id === fId && r.stream_id === sId && r.term === bTerm && r.year === bYear);
  const totalRequiredLessons = classRequirements.reduce((sum, r) => sum + r.lessons_per_week, 0);
  const capacityPct = totalAvailableSlots ? Math.round(totalRequiredLessons / totalAvailableSlots * 100) : 0;

  // Get subject-teacher assignments for this class from Settings
  const classAssignments = getAssignmentsForClass(fId, sId);
  // Subjects that are assigned but don't have a requirement card yet
  const missingCards = classAssignments.filter(a => !classRequirements.some(r => r.subject_id === a.subject_id));

  // ==================== AUTO-FILL FROM SETTINGS ====================
  const handleAutoFill = async () => {
    if (classAssignments.length === 0) {
      toast.error(`No subject-teacher links found for ${getFormName(fId)} ${getStreamName(sId)}. Go to Settings → Subject-Teacher to set them up.`);
      return;
    }
    if (missingCards.length === 0) {
      toast.success('All subject-teacher links already have cards!');
      return;
    }
    if (!confirm(`Auto-create ${missingCards.length} lesson cards from Settings for ${getFormName(fId)} ${getStreamName(sId)}?`)) return;
    setAutoFilling(true);
    let created = 0;
    // De-duplicate by subject_id (one card per subject, take the first teacher found)
    const seenSubjects = new Set<number>();
    for (const a of missingCards) {
      if (seenSubjects.has(a.subject_id)) continue;
      seenSubjects.add(a.subject_id);
      const data = {
        form_id: fId, stream_id: sId,
        subject_id: a.subject_id,
        teacher_id: a.teacher_id,
        lessons_per_week: 3, max_per_day: 2, allow_double: false,
        term: bTerm, year: bYear,
      };
      const { error } = await supabase.from('school_timetable_requirements').upsert([data], { onConflict: 'form_id,stream_id,subject_id,term,year' });
      if (!error) created++;
    }
    toast.success(`✅ Auto-filled ${created} lesson cards from Settings`);
    await fetchAll();
    setAutoFilling(false);
  };

  // ==================== CARD OPERATIONS ====================
  const handleDeleteRequirement = async (id: number) => {
    if (!confirm('Remove this subject requirement?')) return;
    await supabase.from('school_timetable_requirements').delete().eq('id', id);
    toast.success('Removed');
    fetchAll();
  };

  const handleUpdateReqLessons = async (req: any, n: number) => {
    if (n < 1 || n > 10) return;
    await supabase.from('school_timetable_requirements').update({ lessons_per_week: n }).eq('id', req.id);
    fetchAll();
  };

  const handleUpdateMaxPerDay = async (req: any, n: number) => {
    if (n < 1 || n > 5) return;
    await supabase.from('school_timetable_requirements').update({ max_per_day: n }).eq('id', req.id);
    fetchAll();
  };

  const handleUpdateReqTeacher = async (req: any, tid: string) => {
    await supabase.from('school_timetable_requirements').update({ teacher_id: tid ? Number(tid) : null }).eq('id', req.id);
    fetchAll();
  };

  const handleCopyRequirements = async () => {
    if (!confirm(`Copy all requirements from ${getFormName(fId)} ${getStreamName(sId)} to all other streams of the same form?`)) return;
    if (!classRequirements.length) { toast.error('No requirements'); return; }
    const tgt = streams.filter(s => s.id !== sId);
    let c = 0;
    for (const s of tgt) {
      for (const r of classRequirements) {
        // Auto-resolve teacher for target stream from settings
        const teacherId = getTeacherForSubjectClass(r.subject_id, fId, s.id);
        await supabase.from('school_timetable_requirements').upsert([{
          form_id: r.form_id, stream_id: s.id, subject_id: r.subject_id,
          teacher_id: teacherId || r.teacher_id, // use Settings teacher if available, otherwise copy original
          lessons_per_week: r.lessons_per_week, max_per_day: r.max_per_day,
          allow_double: r.allow_double, term: bTerm, year: bYear
        }], { onConflict: 'form_id,stream_id,subject_id,term,year' });
        c++;
      }
    }
    toast.success(`Copied ${c} requirements to ${tgt.length} streams`);
    fetchAll();
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2">📋 Lesson Cards</h1>
        <p className="text-sm text-gray-500 mt-0.5">Auto-fill from Settings or manually configure — set lessons/week & max/day for each subject</p>
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

          {/* Stats */}
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

          {/* Settings link count */}
          <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-700 flex items-center gap-1.5">
            <FiLink size={12} /> {classAssignments.length} links in Settings
          </div>

          {/* Auto-Fill Button */}
          <button onClick={handleAutoFill} disabled={autoFilling || classAssignments.length === 0}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0">
            <FiZap size={15} /> {autoFilling ? 'Filling...' : 'Auto-Fill from Settings'}
          </button>

          {classRequirements.length > 0 && (
            <button onClick={handleCopyRequirements} className="px-4 py-2.5 bg-white border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:border-blue-300 hover:bg-blue-50 transition-all">
              <FiCopy size={14} /> Copy to Streams
            </button>
          )}
        </div>
      </div>

      {/* Warning if no assignments in settings */}
      {classAssignments.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <FiAlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={18} />
          <div>
            <p className="text-sm font-bold text-amber-800">No subject-teacher assignments found for {getFormName(fId)} {getStreamName(sId)}</p>
            <p className="text-xs text-amber-600 mt-1">Go to <strong>Settings → Subject-Teacher</strong> tab to assign teachers to subjects first. Then come back and click &quot;Auto-Fill from Settings&quot;.</p>
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
              <h3 className="font-bold text-gray-800">{getFormName(fId)} {getStreamName(sId)}</h3>
              <p className="text-[10px] text-gray-500">{classRequirements.length} subjects • {totalRequiredLessons} lessons/week</p>
            </div>
          </div>
          <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">{bTerm} {bYear}</span>
        </div>

        {classRequirements.length === 0 ? (
          <div className="text-center py-16">
            <FiList size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="font-bold text-gray-400 text-lg">No Lesson Cards Yet</p>
            <p className="text-sm text-gray-300 mt-1">Click &quot;Auto-Fill from Settings&quot; to create cards from your subject-teacher assignments</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            {classRequirements.map(req => {
              const color = getSubjectColor(req.subject_id, subjects);
              const placed = termEntries.filter(e => e.form_id === req.form_id && e.stream_id === req.stream_id && e.subject_id === req.subject_id).length;
              const pct = Math.round(placed / req.lessons_per_week * 100);
              const isComplete = placed >= req.lessons_per_week;

              // Get teachers linked to this subject for this class from Settings
              const linkedTeachers = classAssignments
                .filter(a => a.subject_id === req.subject_id)
                .map(a => ({ id: a.teacher_id, name: getTeacherName(a.teacher_id) }));

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

                  {/* Editable Lessons/Week */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex items-center gap-1.5 bg-white/70 rounded-xl px-3 py-2 border border-white/50 backdrop-blur-sm shadow-sm">
                      <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week - 1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><FiChevronDown size={12} /></button>
                      <span className="text-lg font-black min-w-[28px] text-center" style={{ color: color.text }}>{req.lessons_per_week}</span>
                      <button onClick={() => handleUpdateReqLessons(req, req.lessons_per_week + 1)} className="w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><FiChevronUp size={12} /></button>
                      <span className="text-[10px] text-gray-500 font-bold ml-1">L/wk</span>
                    </div>

                    {/* Editable Max/Day */}
                    <div className="flex items-center gap-1 bg-white/70 rounded-xl px-2.5 py-2 border border-white/50 backdrop-blur-sm shadow-sm">
                      <button onClick={() => handleUpdateMaxPerDay(req, req.max_per_day - 1)} className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><FiChevronDown size={10} /></button>
                      <span className="text-sm font-black min-w-[18px] text-center" style={{ color: color.text }}>{req.max_per_day}</span>
                      <button onClick={() => handleUpdateMaxPerDay(req, req.max_per_day + 1)} className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"><FiChevronUp size={10} /></button>
                      <span className="text-[9px] text-gray-500 font-bold ml-0.5">max/day</span>
                    </div>

                    {isComplete && <div className="px-2.5 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black">✅ Done</div>}
                  </div>

                  {/* Teacher — auto-filled from Settings, editable */}
                  <div>
                    <label className="text-[9px] font-bold uppercase text-gray-500 block mb-1.5">
                      👤 Teacher {linkedTeachers.length > 0 && <span className="text-emerald-600 normal-case">(from Settings)</span>}
                    </label>
                    <select value={req.teacher_id || ''} onChange={e => handleUpdateReqTeacher(req, e.target.value)} className="w-full px-3 py-2 rounded-xl text-xs border-2 border-white/50 bg-white/80 backdrop-blur-sm font-medium focus:border-blue-300 outline-none">
                      <option value="">— Any Available —</option>
                      {/* Show linked teachers from Settings first, highlighted */}
                      {linkedTeachers.length > 0 && <optgroup label="✅ From Settings">
                        {linkedTeachers.map(t => <option key={t.id} value={t.id}>✅ {t.name}</option>)}
                      </optgroup>}
                      <optgroup label="All Teachers">
                        {teachers.filter(t => !linkedTeachers.some(lt => lt.id === t.id)).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                      </optgroup>
                    </select>
                  </div>

                  {/* Progress bar */}
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

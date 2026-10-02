'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPlus, FiRefreshCw, FiX, FiCheck, FiEdit2, FiTrash2,
  FiDownload, FiPrinter, FiChevronRight, FiAlertTriangle,
  FiUser, FiClock, FiGrid, FiList
} from 'react-icons/fi';

const DUTY_TYPES = [
  { name: 'Gate Duty', emoji: '🚪', desc: 'Morning/evening school gate' },
  { name: 'Dining Hall', emoji: '🍽️', desc: 'Meal supervision & order' },
  { name: 'Morning Assembly', emoji: '🎙️', desc: 'School assembly oversight' },
  { name: 'Library', emoji: '📚', desc: 'Library supervision' },
  { name: 'Exam Invigilation', emoji: '📝', desc: 'Exam room supervision' },
  { name: 'Dormitory', emoji: '🏠', desc: 'Boarding dorm supervision' },
  { name: 'Sports Ground', emoji: '⚽', desc: 'Games & P.E. field' },
  { name: 'Evening Prep', emoji: '📖', desc: 'Prep time supervision' },
  { name: 'Weekend Duty', emoji: '📅', desc: 'Weekend boarding duty' },
  { name: 'Clinic', emoji: '🏥', desc: 'Sick bay / first aid cover' },
  { name: 'Bus / Transport', emoji: '🚌', desc: 'Student transport escort' },
  { name: 'Security Patrol', emoji: '🛡️', desc: 'School perimeter patrol' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFTS = [
  '5:30 AM – 7:30 AM (Early Morning)',
  '7:30 AM – 9:00 AM (Morning)',
  '9:00 AM – 1:00 PM (Mid-Morning)',
  '1:00 PM – 3:00 PM (Afternoon)',
  '3:00 PM – 6:00 PM (Games)',
  '6:00 PM – 9:00 PM (Evening/Prep)',
  '9:00 PM – 6:00 AM (Night)',
  'Full Day (6 AM – 9 PM)',
];

const STATUS_CFG: Record<string, { color: string; bg: string; border: string }> = {
  Scheduled: { color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  Completed:  { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  Missed:     { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  Swapped:    { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  Cancelled:  { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
};

const DAY_COLORS: Record<string, string> = {
  Monday: '#6366f1', Tuesday: '#3b82f6', Wednesday: '#06b6d4',
  Thursday: '#10b981', Friday: '#f59e0b', Saturday: '#ef4444', Sunday: '#8b5cf6',
};

function getWeekNumber(d: Date) {
  const s = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - s.getTime()) / 86400000 + s.getDay() + 1) / 7);
}

export default function DutyRosterPage() {
  const [duties, setDuties] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'teacher'>('grid');
  const [filterDay, setFilterDay] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [weekNum, setWeekNum] = useState(getWeekNumber(new Date()));
  const [editId, setEditId] = useState<number | null>(null);
  const currentYear = new Date().getFullYear();

  const emptyForm = {
    teacher_id: 0, duty_type: 'Gate Duty', day_of_week: 'Monday',
    shift: SHIFTS[0], notes: '', status: 'Scheduled',
  };
  const [form, setForm] = useState(emptyForm);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [dr, tr] = await Promise.all([
      supabase.from('school_duty_roster').select('*')
        .eq('year', currentYear).eq('week_number', weekNum)
        .order('day_of_week').order('shift'),
      supabase.from('school_teachers').select('id, full_name, staff_type, subject_id')
        .eq('status', 'Active').order('full_name'),
    ]);
    setDuties(dr.data || []);
    setTeachers(tr.data || []);
    setLoading(false);
  }, [weekNum, currentYear]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const save = async () => {
    if (!form.teacher_id) { toast.error('Select a teacher'); return; }
    setSaving(true);
    const teacher = teachers.find(t => t.id === Number(form.teacher_id));
    const payload = {
      ...form, teacher_id: Number(form.teacher_id),
      teacher_name: teacher?.full_name || '',
      week_number: weekNum, year: currentYear,
    };
    const { error } = editId
      ? await supabase.from('school_duty_roster').update(payload).eq('id', editId)
      : await supabase.from('school_duty_roster').insert([payload]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Duty updated' : '✅ Duty assigned');
    setShowModal(false); setForm(emptyForm); setEditId(null);
    setSaving(false); fetchAll();
  };

  const deleteDuty = async (id: number) => {
    if (!confirm('Remove this duty?')) return;
    await supabase.from('school_duty_roster').delete().eq('id', id);
    toast.success('Removed'); fetchAll();
  };

  const markStatus = async (id: number, status: string) => {
    await supabase.from('school_duty_roster').update({ status }).eq('id', id);
    setDuties(prev => prev.map(d => d.id === id ? { ...d, status } : d));
    toast.success(`Marked as ${status}`);
  };

  const autoGenerate = async () => {
    if (teachers.length === 0) { toast.error('No active teachers found'); return; }
    if (!confirm(`Auto-generate balanced duty roster for Week ${weekNum}, ${currentYear}?\n\nDuties will be distributed evenly across ${teachers.length} teachers.`)) return;
    setSaving(true);

    // First clear existing for this week
    await supabase.from('school_duty_roster')
      .delete().eq('year', currentYear).eq('week_number', weekNum);

    const rows: any[] = [];
    let tIdx = 0;
    const schoolDays = DAYS.slice(0, 5); // Mon-Fri
    const dutySlots = DUTY_TYPES.slice(0, 6); // Top 6 duty types

    schoolDays.forEach(day => {
      dutySlots.forEach((dtype, si) => {
        const t = teachers[tIdx % teachers.length];
        rows.push({
          teacher_id: t.id, teacher_name: t.full_name,
          duty_type: dtype.name,
          day_of_week: day,
          shift: SHIFTS[si % 5],
          week_number: weekNum, year: currentYear,
          status: 'Scheduled',
          notes: 'Auto-generated by APSIMS',
        });
        tIdx++;
      });
    });

    const { error } = await supabase.from('school_duty_roster').insert(rows);
    if (error) toast.error(error.message);
    else toast.success(`✅ Generated ${rows.length} duties for Week ${weekNum}! Each teacher gets a fair rotation.`);
    setSaving(false); fetchAll();
  };

  // Filtered duties
  const filtered = duties.filter(d =>
    (filterDay === 'All' || d.day_of_week === filterDay) &&
    (filterType === 'All' || d.duty_type === filterType) &&
    (filterStatus === 'All' || d.status === filterStatus)
  );

  // Group by day
  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = filtered.filter(d => d.day_of_week === day);
    return acc;
  }, {} as Record<string, any[]>);

  // Group by teacher
  const byTeacher = teachers.map(t => ({
    ...t, duties: filtered.filter(d => d.teacher_id === t.id),
  })).filter(t => t.duties.length > 0);

  // Stats
  const stats = {
    total: duties.length,
    scheduled: duties.filter(d => d.status === 'Scheduled').length,
    completed: duties.filter(d => d.status === 'Completed').length,
    missed: duties.filter(d => d.status === 'Missed').length,
    teachers: new Set(duties.map(d => d.teacher_id)).size,
    compliance: duties.length > 0 ? Math.round(duties.filter(d => d.status === 'Completed').length / duties.length * 100) : 0,
  };

  const openEdit = (d: any) => {
    setForm({ teacher_id: d.teacher_id, duty_type: d.duty_type, day_of_week: d.day_of_week, shift: d.shift, notes: d.notes || '', status: d.status });
    setEditId(d.id); setShowModal(true);
  };

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* ═══ HERO HEADER ═══ */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#4f46e5 100%)' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white/20 shadow-inner">📋</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold text-white">Duty Roster</h1>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase tracking-wider">Ultra</span>
                </div>
                <p className="text-indigo-200 text-sm">
                  Week <span className="font-black text-white">{weekNum}</span> · {currentYear} ·{' '}
                  <span className="font-semibold">{stats.total} assignments</span> across{' '}
                  <span className="font-semibold">{stats.teachers} teachers</span>
                </p>
                <p className="text-indigo-300 text-xs mt-1">
                  💡 Different from attendance — this tracks teachers' SUPERVISION duties, not whether they came to school
                </p>
              </div>
            </div>
            {/* Week navigator */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-white/10 border border-white/20 rounded-xl overflow-hidden">
                <button onClick={() => setWeekNum(w => Math.max(1, w - 1))} className="px-4 py-2 text-white font-black hover:bg-white/20 transition text-lg">‹</button>
                <span className="px-4 py-2 text-white font-black border-x border-white/20 text-sm">Week {weekNum}</span>
                <button onClick={() => setWeekNum(w => Math.min(52, w + 1))} className="px-4 py-2 text-white font-black hover:bg-white/20 transition text-lg">›</button>
              </div>
              <button onClick={() => setWeekNum(getWeekNumber(new Date()))}
                className="px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition">
                This Week
              </button>
              <button onClick={autoGenerate} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold transition disabled:opacity-60 shadow">
                <FiRefreshCw size={14} className={saving ? 'animate-spin' : ''} /> Auto-Generate
              </button>
              <button onClick={() => { setForm(emptyForm); setEditId(null); setShowModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-indigo-700 text-sm font-bold hover:bg-indigo-50 transition shadow">
                <FiPlus size={14} /> Assign Duty
              </button>
            </div>
          </div>

          {/* ── Compliance bar ── */}
          {stats.total > 0 && (
            <div className="mt-5 bg-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white text-xs font-bold">Weekly Duty Compliance</span>
                <span className="text-white font-black">{stats.compliance}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-700"
                  style={{ width: `${stats.compliance}%`, background: stats.compliance >= 80 ? '#22c55e' : stats.compliance >= 50 ? '#f59e0b' : '#ef4444' }} />
              </div>
              <div className="flex gap-4 mt-2 text-[10px] text-indigo-200">
                <span>✅ {stats.completed} done</span>
                <span>📅 {stats.scheduled} pending</span>
                <span>❌ {stats.missed} missed</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Duties', value: stats.total, color: '#6366f1', bg: '#eef2ff', icon: '📋' },
          { label: 'Scheduled', value: stats.scheduled, color: '#2563eb', bg: '#eff6ff', icon: '📅' },
          { label: 'Completed', value: stats.completed, color: '#16a34a', bg: '#f0fdf4', icon: '✅' },
          { label: 'Missed', value: stats.missed, color: '#dc2626', bg: '#fef2f2', icon: '❌' },
          { label: 'Teachers On Duty', value: stats.teachers, color: '#d97706', bg: '#fffbeb', icon: '👨‍🏫' },
          { label: 'Compliance %', value: `${stats.compliance}%`, color: stats.compliance >= 80 ? '#16a34a' : '#d97706', bg: '#f0fdf4', icon: '📊' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
            <div className="text-xl mb-2">{s.icon}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-gray-500 mt-0.5 font-semibold">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ FILTER + VIEW TOGGLE ═══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* View toggle */}
          <div className="flex rounded-xl border border-gray-200 overflow-hidden">
            {([['grid', <FiGrid size={14} />, 'By Day'], ['list', <FiList size={14} />, 'List'], ['teacher', <FiUser size={14} />, 'By Teacher']] as const).map(([mode, icon, label]) => (
              <button key={mode} onClick={() => setViewMode(mode as any)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold transition ${viewMode === mode ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {icon}{label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase">Day:</span>
            {['All', ...DAYS.slice(0, 5)].map(d => (
              <button key={d} onClick={() => setFilterDay(d)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${filterDay === d ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}
                style={filterDay === d ? { background: DAY_COLORS[d] || '#6366f1' } : {}}>
                {d}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-black text-gray-400 uppercase">Status:</span>
            {['All', 'Scheduled', 'Completed', 'Missed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${filterStatus === s ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {s}
              </button>
            ))}
          </div>

          <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-600 font-bold hover:bg-gray-50 transition">
            <FiPrinter size={13} /> Print Roster
          </button>
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-10 h-10 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500 font-medium">Loading duty roster…</p>
          </div>
        </div>
      ) : filtered.length === 0 && duties.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-black text-gray-700 mb-2">No duties assigned for Week {weekNum}</h3>
          <p className="text-sm text-gray-400 mb-6">Click <strong>Auto-Generate</strong> to distribute duties evenly across all teachers, or manually assign individual duties.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={autoGenerate} disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition">
              <FiRefreshCw size={14} className={saving ? 'animate-spin' : ''} /> Auto-Generate Roster
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl border border-indigo-200 text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition">
              <FiPlus size={14} /> Assign Manually
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* ── BY DAY GRID ── */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAYS.slice(0, 6).map(day => {
            const dayDuties = byDay[day] || [];
            const dayColor = DAY_COLORS[day];
            return (
              <div key={day} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition">
                {/* Day header */}
                <div className="px-5 py-3 flex items-center justify-between" style={{ background: `${dayColor}15`, borderBottom: `3px solid ${dayColor}` }}>
                  <div>
                    <h3 className="font-black text-gray-800">{day}</h3>
                    <p className="text-[10px]" style={{ color: dayColor }}>{dayDuties.length} duty{dayDuties.length !== 1 ? 'ies' : ''} assigned</p>
                  </div>
                  <button onClick={() => { setForm({ ...emptyForm, day_of_week: day }); setEditId(null); setShowModal(true); }}
                    className="w-8 h-8 rounded-xl flex items-center justify-center transition"
                    style={{ background: `${dayColor}25`, color: dayColor }}>
                    <FiPlus size={14} />
                  </button>
                </div>

                {dayDuties.length === 0 ? (
                  <div className="py-8 text-center text-gray-300 text-xs">
                    <div className="text-3xl mb-2">😴</div>
                    No duties — click + to assign
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {dayDuties.map(d => {
                      const sCfg = STATUS_CFG[d.status] || STATUS_CFG.Scheduled;
                      const dutyInfo = DUTY_TYPES.find(dt => dt.name === d.duty_type);
                      return (
                        <div key={d.id} className="px-4 py-3 hover:bg-gray-50/80 transition group">
                          <div className="flex items-start gap-3">
                            <div className="text-xl flex-shrink-0 mt-0.5">{dutyInfo?.emoji || '📌'}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <p className="text-xs font-black text-gray-800 truncate">{d.duty_type}</p>
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                                  style={{ background: sCfg.bg, color: sCfg.color, border: `1px solid ${sCfg.border}` }}>
                                  {d.status}
                                </span>
                              </div>
                              <p className="text-[11px] font-semibold mt-0.5" style={{ color: dayColor }}>👨‍🏫 {d.teacher_name}</p>
                              <p className="text-[10px] text-gray-400 mt-0.5">⏰ {d.shift.split(' (')[0]}</p>
                              {d.notes && d.notes !== 'Auto-generated by APSIMS' && (
                                <p className="text-[10px] text-gray-400 italic mt-0.5">"{d.notes}"</p>
                              )}
                              {/* Quick status buttons */}
                              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
                                {d.status !== 'Completed' && (
                                  <button onClick={() => markStatus(d.id, 'Completed')}
                                    className="text-[9px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold hover:bg-green-200 transition">
                                    ✅ Done
                                  </button>
                                )}
                                {d.status !== 'Missed' && (
                                  <button onClick={() => markStatus(d.id, 'Missed')}
                                    className="text-[9px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-bold hover:bg-red-200 transition">
                                    ❌ Missed
                                  </button>
                                )}
                                <button onClick={() => openEdit(d)}
                                  className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-bold hover:bg-blue-200 transition">
                                  ✏️ Edit
                                </button>
                                <button onClick={() => deleteDuty(d.id)}
                                  className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-bold hover:bg-red-100 hover:text-red-600 transition">
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === 'teacher' ? (
        /* ── BY TEACHER ── */
        <div className="space-y-3">
          {byTeacher.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No duties match the current filters</div>
          ) : byTeacher.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50 bg-gradient-to-r from-slate-50 to-indigo-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-base">
                    {t.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-gray-800">{t.full_name}</p>
                    <p className="text-[10px] text-gray-500">{t.staff_type} · {t.duties.length} duties this week</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
                    {t.duties.filter((d: any) => d.status === 'Completed').length}/{t.duties.length} done
                  </span>
                </div>
              </div>
              <div className="p-4 flex flex-wrap gap-2">
                {t.duties.map((d: any) => {
                  const sCfg = STATUS_CFG[d.status] || STATUS_CFG.Scheduled;
                  const dutyInfo = DUTY_TYPES.find(dt => dt.name === d.duty_type);
                  const dColor = DAY_COLORS[d.day_of_week] || '#6366f1';
                  return (
                    <div key={d.id} className="rounded-xl border p-3 hover:shadow-md transition group cursor-default"
                      style={{ borderColor: sCfg.border, background: sCfg.bg, minWidth: 160 }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-base">{dutyInfo?.emoji || '📌'}</span>
                        <span className="text-xs font-black" style={{ color: sCfg.color }}>{d.duty_type}</span>
                      </div>
                      <p className="text-[10px] font-bold" style={{ color: dColor }}>{d.day_of_week}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{d.shift.split(' (')[0]}</p>
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => markStatus(d.id, 'Completed')} className="text-[9px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-bold">✅</button>
                        <button onClick={() => markStatus(d.id, 'Missed')} className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-bold">❌</button>
                        <button onClick={() => openEdit(d)} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-bold">✏️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── LIST VIEW ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Duty Type', 'Teacher', 'Day', 'Shift', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-gray-400 text-sm">No duties found</td></tr>
              ) : filtered.map(d => {
                const sCfg = STATUS_CFG[d.status] || STATUS_CFG.Scheduled;
                const dutyInfo = DUTY_TYPES.find(dt => dt.name === d.duty_type);
                const dColor = DAY_COLORS[d.day_of_week] || '#6366f1';
                return (
                  <tr key={d.id} className="hover:bg-gray-50/60 transition group">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{dutyInfo?.emoji || '📌'}</span>
                        <div>
                          <p className="font-bold text-gray-800 text-xs">{d.duty_type}</p>
                          <p className="text-[10px] text-gray-400">{dutyInfo?.desc}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-700 text-xs">{d.teacher_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: dColor }}>{d.day_of_week}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">{d.shift.split(' (')[0]}</td>
                    <td className="px-4 py-3">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: sCfg.bg, color: sCfg.color }}>{d.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => markStatus(d.id, 'Completed')} title="Mark Done" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition"><FiCheck size={11} /></button>
                        <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg bg-blue-50 text-blue-500 hover:bg-blue-100 transition"><FiEdit2 size={11} /></button>
                        <button onClick={() => deleteDuty(d.id)} className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 transition"><FiTrash2 size={11} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ SQL SETUP ═══ */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4 cursor-pointer">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup: Run this SQL in Supabase</summary>
        <code className="text-[10px] block bg-white rounded p-3 border border-gray-200 mt-3 overflow-x-auto whitespace-pre text-gray-700">{`CREATE TABLE IF NOT EXISTS school_duty_roster (
  id            serial PRIMARY KEY,
  teacher_id    int REFERENCES school_teachers(id) ON DELETE CASCADE,
  teacher_name  text,
  duty_type     text NOT NULL,
  day_of_week   text NOT NULL,
  shift         text,
  week_number   int NOT NULL,
  year          int NOT NULL,
  notes         text,
  status        text DEFAULT 'Scheduled'
                CHECK (status IN ('Scheduled','Completed','Missed','Swapped','Cancelled')),
  created_at    timestamptz DEFAULT now()
);
ALTER TABLE school_duty_roster ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_duty_roster" ON school_duty_roster FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_duty_roster_week ON school_duty_roster(year, week_number);
CREATE INDEX IF NOT EXISTS idx_duty_roster_teacher ON school_duty_roster(teacher_id);`}
        </code>
      </details>

      {/* ═══ ASSIGN MODAL ═══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg,#eef2ff,#e0e7ff)' }}>
              <div className="flex items-center gap-3">
                <span className="text-xl">{DUTY_TYPES.find(d => d.name === form.duty_type)?.emoji || '📋'}</span>
                <div>
                  <h2 className="font-black text-gray-800">{editId ? 'Edit Duty Assignment' : 'Assign New Duty'}</h2>
                  <p className="text-[10px] text-gray-500">Week {weekNum}, {currentYear}</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Teacher */}
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">👨‍🏫 Teacher *</label>
                <select value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none bg-white">
                  <option value={0}>Select teacher…</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name} — {t.staff_type}</option>)}
                </select>
              </div>

              {/* Duty Type — card picker */}
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">📌 Duty Type</label>
                <div className="grid grid-cols-3 gap-2 max-h-44 overflow-y-auto">
                  {DUTY_TYPES.map(dt => (
                    <button key={dt.name} onClick={() => setForm(f => ({ ...f, duty_type: dt.name }))}
                      className={`p-2 rounded-xl border text-center transition text-xs ${form.duty_type === dt.name ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-black' : 'border-gray-200 hover:border-indigo-200 text-gray-600'}`}>
                      <div className="text-lg mb-0.5">{dt.emoji}</div>
                      <div className="font-semibold leading-tight text-[10px]">{dt.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Day + Shift */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">📅 Day</label>
                  <select value={form.day_of_week} onChange={e => setForm(f => ({ ...f, day_of_week: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    {DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">⏰ Shift</label>
                  <select value={form.shift} onChange={e => setForm(f => ({ ...f, shift: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                    {SHIFTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {editId && (
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">📊 Status</label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(STATUS_CFG).map(([s, cfg]) => (
                      <button key={s} onClick={() => setForm(f => ({ ...f, status: s }))}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition"
                        style={form.status === s ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border } : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">💬 Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Special instructions, location, swap reason…"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none" />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={save} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60 transition shadow-lg"
                style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />}
                {editId ? 'Update Assignment' : 'Assign Duty'}
              </button>
              <button onClick={() => setShowModal(false)}
                className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

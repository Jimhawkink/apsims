'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useTimetable } from './TimetableProvider';
import { DAYS, PERIOD_TYPE_STYLES } from './timetable-colors';
import { FiPlus, FiEdit3, FiTrash2, FiCheck, FiX } from 'react-icons/fi';

// ═══ PERIOD SETUP TAB ════════════════════════════════════════════
export function SetupTab() {
  const ctx = useTimetable();
  const { periods, allPeriodsSorted, fetchAll } = ctx;
  const [editPeriod, setEditPeriod] = useState<any>(null);
  const [newPeriod, setNewPeriod] = useState({ period_number: 0, period_name: '', start_time: '', end_time: '', period_type: 'lesson' });

  const handleSavePeriod = async (p: any) => {
    const { error } = await supabase.from('school_timetable_periods').update({ period_name: p.period_name, start_time: p.start_time, end_time: p.end_time, period_type: p.period_type }).eq('id', p.id);
    if (error) toast.error(error.message); else { toast.success('Updated'); setEditPeriod(null); fetchAll(); }
  };
  const handleAddPeriod = async () => {
    if (!newPeriod.period_name) { toast.error('Fill all fields'); return; }
    const num = periods.length ? Math.max(...periods.map(p => p.period_number)) + 1 : 1;
    await supabase.from('school_timetable_periods').insert([{ ...newPeriod, period_number: num }]);
    toast.success('Added'); setNewPeriod({ period_number: 0, period_name: '', start_time: '', end_time: '', period_type: 'lesson' }); fetchAll();
  };
  const handleDeletePeriod = async (id: number) => {
    if (!confirm('Delete this period? Associated entries will also be removed.')) return;
    await supabase.from('school_timetable_entries').delete().eq('period_id', id);
    await supabase.from('school_timetable_periods').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-black text-gray-800">⚙️ Period Setup</h1><p className="text-sm text-gray-500 mt-0.5">School day configuration — Kenya MoE standard (8-4-4 & CBC)</p></div>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-b">{['#', 'Period Name', 'Start', 'End', 'Type', 'Actions'].map(h => <th key={h} className="px-5 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
          <tbody>
            {allPeriodsSorted.map(p => {
              const style = PERIOD_TYPE_STYLES[p.period_type] || PERIOD_TYPE_STYLES.lesson;
              return (
                <tr key={p.id} className={`border-b border-gray-50 ${p.period_type !== 'lesson' ? 'bg-amber-50/30' : 'hover:bg-blue-50/20'} transition-colors`}>
                  <td className="px-5 py-3 text-gray-400 font-bold">{p.period_number}</td>
                  {editPeriod?.id === p.id ? (<>
                    <td className="px-5 py-2"><input value={editPeriod.period_name} onChange={e => setEditPeriod({ ...editPeriod, period_name: e.target.value })} className="w-full px-3 py-2 border-2 border-blue-200 rounded-xl text-sm font-medium" /></td>
                    <td className="px-5 py-2"><input type="time" value={editPeriod.start_time} onChange={e => setEditPeriod({ ...editPeriod, start_time: e.target.value })} className="px-3 py-2 border-2 border-blue-200 rounded-xl text-sm" /></td>
                    <td className="px-5 py-2"><input type="time" value={editPeriod.end_time} onChange={e => setEditPeriod({ ...editPeriod, end_time: e.target.value })} className="px-3 py-2 border-2 border-blue-200 rounded-xl text-sm" /></td>
                    <td className="px-5 py-2"><select value={editPeriod.period_type} onChange={e => setEditPeriod({ ...editPeriod, period_type: e.target.value })} className="px-3 py-2 border-2 border-blue-200 rounded-xl text-sm"><option value="lesson">Lesson</option><option value="break">Break</option><option value="assembly">Assembly</option><option value="lunch">Lunch</option><option value="games">Games</option></select></td>
                    <td className="px-5 py-2 flex gap-1.5"><button onClick={() => handleSavePeriod(editPeriod)} className="px-3 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold"><FiCheck size={12} /></button><button onClick={() => setEditPeriod(null)} className="px-3 py-2 bg-gray-200 rounded-xl text-xs"><FiX size={12} /></button></td>
                  </>) : (<>
                    <td className="px-5 py-3 font-bold text-gray-800">{style.icon} {p.period_name}</td>
                    <td className="px-5 py-3 text-xs text-gray-600 font-medium">{p.start_time?.substring(0, 5)}</td>
                    <td className="px-5 py-3 text-xs text-gray-600 font-medium">{p.end_time?.substring(0, 5)}</td>
                    <td className="px-5 py-3"><span className={`px-3 py-1 rounded-full text-[10px] font-bold ${style.bg} ${style.text}`}>{style.label}</span></td>
                    <td className="px-5 py-3 flex gap-1.5">
                      <button onClick={() => setEditPeriod({ ...p })} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100"><FiEdit3 size={12} /></button>
                      <button onClick={() => handleDeletePeriod(p.id)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100"><FiTrash2 size={12} /></button>
                    </td>
                  </>)}
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-5 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/20">
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-3">Add New Period</p>
          <div className="flex gap-2 items-end flex-wrap">
            <input placeholder="Period Name" value={newPeriod.period_name} onChange={e => setNewPeriod({ ...newPeriod, period_name: e.target.value })} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm w-44 font-medium" />
            <input type="time" value={newPeriod.start_time} onChange={e => setNewPeriod({ ...newPeriod, start_time: e.target.value })} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" />
            <input type="time" value={newPeriod.end_time} onChange={e => setNewPeriod({ ...newPeriod, end_time: e.target.value })} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" />
            <select value={newPeriod.period_type} onChange={e => setNewPeriod({ ...newPeriod, period_type: e.target.value })} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"><option value="lesson">Lesson</option><option value="break">Break</option><option value="assembly">Assembly</option><option value="lunch">Lunch</option><option value="games">Games</option></select>
            <button onClick={handleAddPeriod} className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><FiPlus size={14} /> Add</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══ AVAILABILITY TAB ════════════════════════════════════════════
export function AvailabilityTab() {
  const ctx = useTimetable();
  const { teachers, lessonPeriods, toggleAvailability, isAvailable, getTeacherName } = ctx;
  const [avlTeacher, setAvlTeacher] = useState('');

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-black text-gray-800">👨‍🏫 Teacher Availability</h1><p className="text-sm text-gray-500 mt-0.5">Mark when teachers are available/unavailable — click cells to toggle</p></div>
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Select Teacher</label>
        <select value={avlTeacher} onChange={e => setAvlTeacher(e.target.value)} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium min-w-[260px]"><option value="">— Select Teacher —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select>
      </div>
      {avlTeacher && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">{getTeacherName(Number(avlTeacher))} — Availability Grid</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-emerald-100 border-2 border-emerald-300 inline-block" /> Available</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-lg bg-red-100 border-2 border-red-300 inline-block" /> Unavailable</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead><tr>
                <th className="bg-slate-800 text-white px-3 py-3 text-left text-[10px] font-bold">Period</th>
                <th className="bg-slate-800 text-white px-2 py-3 text-[10px] font-bold">Time</th>
                {DAYS.map(d => <th key={d} className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white px-3 py-3 text-center text-[10px] font-bold">{d}</th>)}
              </tr></thead>
              <tbody>
                {lessonPeriods.map(p => (
                  <tr key={p.id}>
                    <td className="bg-gray-50 px-3 py-2.5 font-bold text-xs border border-gray-200">{p.period_name}</td>
                    <td className="bg-gray-50 px-2 py-2.5 text-[10px] text-gray-500 border border-gray-200">{p.start_time?.substring(0, 5)}-{p.end_time?.substring(0, 5)}</td>
                    {DAYS.map(day => {
                      const avail = isAvailable(Number(avlTeacher), day, p.id);
                      return (
                        <td key={day} onClick={() => toggleAvailability(Number(avlTeacher), day, p.id)}
                          className={`border border-gray-200 text-center p-2.5 cursor-pointer transition-all hover:scale-105 ${avail ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-red-50 hover:bg-red-100'}`}>
                          {avail ? <FiCheck className="mx-auto text-emerald-500" size={20} /> : <FiX className="mx-auto text-red-500" size={20} />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

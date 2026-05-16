'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { useTimetable } from './TimetableProvider';
import { ROOM_TYPE_COLORS } from './timetable-colors';
import { FiPlus, FiTrash2, FiSave, FiMapPin, FiRepeat } from 'react-icons/fi';

// ═══ CLASSROOMS TAB ══════════════════════════════════════════════
export function ClassroomsTab() {
  const ctx = useTimetable();
  const { classrooms, fetchAll } = ctx;
  const [showAdd, setShowAdd] = useState(false);
  const [newRoom, setNewRoom] = useState<any>({ room_name: '', room_code: '', room_type: 'classroom', capacity: 40, is_active: true });

  const handleAdd = async () => {
    if (!newRoom.room_name) { toast.error('Enter room name'); return; }
    const { error } = await supabase.from('school_classrooms').insert([newRoom]);
    if (error) toast.error(error.message);
    else { toast.success('Room added'); setShowAdd(false); setNewRoom({ room_name: '', room_code: '', room_type: 'classroom', capacity: 40, is_active: true }); fetchAll(); }
  };
  const handleDelete = async (id: number) => { if (!confirm('Delete this room?')) return; await supabase.from('school_classrooms').delete().eq('id', id); toast.success('Deleted'); fetchAll(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-gray-800">🏫 Classrooms & Rooms</h1><p className="text-sm text-gray-500 mt-0.5">Manage physical rooms and their properties</p></div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><FiPlus size={15} /> Add Room</button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <h4 className="font-bold text-gray-800 mb-4">Add New Room</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Room Name *</label><input value={newRoom.room_name} onChange={e => setNewRoom({ ...newRoom, room_name: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" placeholder="e.g., Lab 1" /></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Room Code</label><input value={newRoom.room_code} onChange={e => setNewRoom({ ...newRoom, room_code: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" placeholder="e.g., LB1" /></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Type</label><select value={newRoom.room_type} onChange={e => setNewRoom({ ...newRoom, room_type: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"><option value="classroom">Classroom</option><option value="lab">Science Lab</option><option value="computer_lab">Computer Lab</option><option value="library">Library</option><option value="gym">Gym / Field</option><option value="hall">Hall</option><option value="workshop">Workshop</option></select></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Capacity</label><input type="number" value={newRoom.capacity} onChange={e => setNewRoom({ ...newRoom, capacity: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleAdd} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold"><FiSave className="inline mr-1.5" size={14} />Save</button>
            <button onClick={() => setShowAdd(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms.map(room => {
          const rc = ROOM_TYPE_COLORS[room.room_type] || ROOM_TYPE_COLORS.classroom;
          return (
            <div key={room.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl transition-all hover:-translate-y-0.5 group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${rc.gradient} flex items-center justify-center text-xl shadow-lg`}>{rc.icon}</div>
                  <div>
                    <h4 className="font-bold text-gray-800">{room.room_name}</h4>
                    {room.room_code && <p className="text-[10px] text-gray-500 font-bold">{room.room_code}</p>}
                  </div>
                </div>
                <button onClick={() => handleDelete(room.id!)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"><FiTrash2 size={14} /></button>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold" style={{ background: rc.bg, color: rc.text }}>{room.room_type}</span>
                <span className="text-[10px] text-gray-500 font-bold">👥 {room.capacity} seats</span>
              </div>
            </div>
          );
        })}
        {classrooms.length === 0 && (
          <div className="col-span-3 text-center py-16">
            <FiMapPin size={48} className="mx-auto mb-4 text-gray-200" />
            <p className="font-bold text-gray-400 text-lg">No Rooms Defined</p>
            <p className="text-sm text-gray-300 mt-1">Click "Add Room" to start</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══ SUBSTITUTIONS TAB ═══════════════════════════════════════════
export function SubstitutionsTab() {
  const ctx = useTimetable();
  const { teachers, forms, streams, substitutions, lessonPeriods, periods, fetchAll, bTerm, bYear,
    getTeacherName, getFormName, getStreamName } = ctx;
  const [showAdd, setShowAdd] = useState(false);
  const [newSub, setNewSub] = useState<any>({ substitution_date: new Date().toISOString().split('T')[0], status: 'pending' });

  const handleAdd = async () => {
    if (!newSub.absent_teacher_id || !newSub.period_id || !newSub.form_id || !newSub.stream_id) { toast.error('Fill required fields'); return; }
    const { error } = await supabase.from('school_substitutions').insert([newSub]);
    if (error) toast.error(error.message);
    else { toast.success('Substitution added'); setShowAdd(false); setNewSub({ substitution_date: new Date().toISOString().split('T')[0], status: 'pending' }); fetchAll(); }
  };
  const handleDelete = async (id: number) => { if (!confirm('Remove?')) return; await supabase.from('school_substitutions').delete().eq('id', id); toast.success('Removed'); fetchAll(); };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-black text-gray-800">🔄 Substitutions</h1><p className="text-sm text-gray-500 mt-0.5">Manage teacher absences and assign substitutes</p></div>
        <button onClick={() => setShowAdd(true)} className="px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-lg shadow-blue-500/20"><FiPlus size={15} /> Add Substitution</button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border-2 border-blue-200 p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600" />
          <h4 className="font-bold text-gray-800 mb-4">New Substitution</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Date</label><input type="date" value={newSub.substitution_date} onChange={e => setNewSub({ ...newSub, substitution_date: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" /></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Absent Teacher *</label><select value={newSub.absent_teacher_id || ''} onChange={e => setNewSub({ ...newSub, absent_teacher_id: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"><option value="">— Select —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Substitute Teacher</label><select value={newSub.substitute_teacher_id || ''} onChange={e => setNewSub({ ...newSub, substitute_teacher_id: Number(e.target.value) || null })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"><option value="">— Select —</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Period *</label><select value={newSub.period_id || ''} onChange={e => setNewSub({ ...newSub, period_id: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"><option value="">— Select —</option>{lessonPeriods.map(p => <option key={p.id} value={p.id}>{p.period_name}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Form *</label><select value={newSub.form_id || ''} onChange={e => setNewSub({ ...newSub, form_id: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"><option value="">— Select —</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</select></div>
            <div><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Stream *</label><select value={newSub.stream_id || ''} onChange={e => setNewSub({ ...newSub, stream_id: Number(e.target.value) })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm"><option value="">— Select —</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
            <div className="sm:col-span-2 lg:col-span-3"><label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Reason</label><input value={newSub.reason || ''} onChange={e => setNewSub({ ...newSub, reason: e.target.value })} placeholder="e.g., Sick leave" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm" /></div>
          </div>
          <div className="flex gap-2 mt-5">
            <button onClick={handleAdd} className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-bold"><FiSave className="inline mr-1.5" size={14} />Save</button>
            <button onClick={() => setShowAdd(false)} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold">Cancel</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead><tr className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-b">{['Date', 'Absent Teacher', 'Substitute', 'Period', 'Class', 'Reason', 'Status', ''].map(h => <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase text-left">{h}</th>)}</tr></thead>
          <tbody>
            {substitutions.length === 0 ? <tr><td colSpan={8} className="text-center py-12"><FiRepeat size={40} className="mx-auto mb-3 text-gray-200" /><p className="text-gray-400 font-medium">No substitutions recorded</p></td></tr> :
              substitutions.map(sub => (
                <tr key={sub.id} className="border-b border-gray-50 hover:bg-blue-50/20 transition-colors">
                  <td className="px-4 py-3 text-xs font-bold text-gray-700">{sub.substitution_date}</td>
                  <td className="px-4 py-3 text-xs font-bold text-red-600">{getTeacherName(sub.absent_teacher_id)}</td>
                  <td className="px-4 py-3 text-xs font-bold text-green-600">{sub.substitute_teacher_id ? getTeacherName(sub.substitute_teacher_id) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 text-xs">{periods.find(p => p.id === sub.period_id)?.period_name || ''}</td>
                  <td className="px-4 py-3 text-xs font-medium">{getFormName(sub.form_id)} {getStreamName(sub.stream_id)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{sub.reason || '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${sub.status === 'assigned' ? 'bg-emerald-100 text-emerald-700' : sub.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{sub.status}</span></td>
                  <td className="px-4 py-3"><button onClick={() => handleDelete(sub.id!)} className="text-gray-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50"><FiTrash2 size={13} /></button></td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

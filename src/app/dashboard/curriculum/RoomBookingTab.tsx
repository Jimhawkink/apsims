'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiCalendar, FiMapPin } from 'react-icons/fi';
import UltraGrid from './UltraGrid';

export default function RoomBookingTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({ room_name: '', room_type: 'Classroom', capacity: 40, building: '', floor: '', facilities: '' });
  const [showBooking, setShowBooking] = useState(false);
  const [bk, setBk] = useState<any>({ room_id: '', day_of_week: 'Monday', period_number: 1, subject_id: '', teacher_id: '', form_id: '', purpose: '' });

  const saveRoom = async () => {
    if (!f.room_name) return toast.error('Room name required');
    const obj = { ...f, facilities: f.facilities?.split(',').map((s: string) => s.trim()).filter(Boolean) };
    await supabase.from('school_room_bookings').insert([obj]);
    toast.success('Room added'); setShow(false); d.fetchAll();
  };

  const delRoom = async (id: number) => { if (!confirm('Delete room?')) return; await supabase.from('school_room_bookings').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };

  const saveBooking = async () => {
    if (!bk.room_id || !bk.subject_id) return toast.error('Room & subject required');
    await supabase.from('school_room_booking_schedule').insert([{ ...bk, is_recurring: true, status: 'Confirmed' }]);
    toast.success('Booking created'); setShowBooking(false); d.fetchAll();
  };

  const delBooking = async (id: number) => { await supabase.from('school_room_booking_schedule').delete().eq('id', id); toast.success('Removed'); d.fetchAll(); };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const roomCols = [
    { key: 'room_name', label: 'Room', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{v}</span> },
    { key: 'room_type', label: 'Type', color: '#065f46', bg: '#ecfdf5' },
    { key: 'capacity', label: 'Capacity', color: '#92400e', bg: '#fffbeb' },
    { key: 'building', label: 'Building', color: '#5b21b6', bg: '#f5f3ff' },
    { key: 'floor', label: 'Floor', color: '#155e75', bg: '#ecfeff' },
    { key: 'is_available', label: 'Available', color: '#166534', bg: '#f0fdf4', render: (v: any) => v ? <span className="text-green-600 font-bold text-[10px]">✓ Available</span> : <span className="text-red-500 text-[10px]">Occupied</span> },
  ];
  const roomActions = [
    { label: 'Delete', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: delRoom },
  ];

  const bookingCols = [
    { key: 'room_id', label: 'Room', color: '#1e40af', bg: '#eff6ff', render: (v: any) => { const r = d.rooms.find((rm: any) => rm.id === v); return <span className="font-bold">{r?.room_name || v}</span>; } },
    { key: 'day_of_week', label: 'Day', color: '#065f46', bg: '#ecfdf5' },
    { key: 'period_number', label: 'Period', color: '#92400e', bg: '#fffbeb' },
    { key: 'subject_id', label: 'Subject', color: '#5b21b6', bg: '#f5f3ff', render: (v: any) => d.getSubjectName(v) },
    { key: 'teacher_id', label: 'Teacher', color: '#155e75', bg: '#ecfeff', render: (v: any) => d.getTeacherName(v) },
    { key: 'form_id', label: 'Form', color: '#166534', bg: '#f0fdf4', render: (v: any) => d.getFormName(v) },
    { key: 'status', label: 'Status', color: '#991b1b', bg: '#fef2f2', render: (v: any) => <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${v === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{v}</span> },
  ];
  const bookingActions = [
    { label: 'Remove', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: delBooking },
  ];

  return (
    <div className="space-y-4">
      {/* Rooms Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiMapPin className="text-indigo-500" /> Rooms / Labs</h3>
          <button onClick={() => setShow(!show)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}><FiPlus size={13} /> Add Room</button>
        </div>
        {show && (
          <div className="space-y-3 mb-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              <div><label className="lbl">Name *</label><input value={f.room_name} onChange={e => setF({ ...f, room_name: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
              <div><label className="lbl">Type</label><select value={f.room_type} onChange={e => setF({ ...f, room_type: e.target.value })} className="select-modern w-full text-sm"><option>Classroom</option><option>Lab</option><option>Library</option><option>Hall</option><option>Staffroom</option></select></div>
              <div><label className="lbl">Capacity</label><input type="number" value={f.capacity} onChange={e => setF({ ...f, capacity: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
              <div><label className="lbl">Building</label><input value={f.building} onChange={e => setF({ ...f, building: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
              <div><label className="lbl">Floor</label><input value={f.floor} onChange={e => setF({ ...f, floor: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
              <div><label className="lbl">Facilities</label><input value={f.facilities} onChange={e => setF({ ...f, facilities: e.target.value })} placeholder="Projector, Lab kit..." className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            </div>
            <button onClick={saveRoom} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>Save Room</button>
          </div>
        )}
        <UltraGrid columns={roomCols} data={d.rooms} actions={roomActions} emptyMessage="No rooms added yet" />
      </div>

      {/* Bookings Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiCalendar className="text-emerald-500" /> Booking Schedule</h3>
          <button onClick={() => setShowBooking(!showBooking)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}><FiPlus size={13} /> New Booking</button>
        </div>
        {showBooking && (
          <div className="space-y-3 mb-3">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              <div><label className="lbl">Room *</label><select value={bk.room_id} onChange={e => setBk({ ...bk, room_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.rooms.map((r: any) => <option key={r.id} value={r.id}>{r.room_name}</option>)}</select></div>
              <div><label className="lbl">Day</label><select value={bk.day_of_week} onChange={e => setBk({ ...bk, day_of_week: e.target.value })} className="select-modern w-full text-sm">{days.map(da => <option key={da}>{da}</option>)}</select></div>
              <div><label className="lbl">Period</label><input type="number" min={1} max={10} value={bk.period_number} onChange={e => setBk({ ...bk, period_number: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
              <div><label className="lbl">Subject *</label><select value={bk.subject_id} onChange={e => setBk({ ...bk, subject_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
              <div><label className="lbl">Teacher</label><select value={bk.teacher_id} onChange={e => setBk({ ...bk, teacher_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
              <div><label className="lbl">Form</label><select value={bk.form_id} onChange={e => setBk({ ...bk, form_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.forms.map((fm: any) => <option key={fm.id} value={fm.id}>Form {fm.form_number || fm.id}</option>)}</select></div>
            </div>
            <button onClick={saveBooking} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>Book Room</button>
          </div>
        )}
        <UltraGrid columns={bookingCols} data={d.roomBookings} actions={bookingActions} emptyMessage="No bookings yet" />
      </div>
    </div>
  );
}

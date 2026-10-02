'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiPlus, FiRefreshCw, FiX, FiCheck, FiEdit2, FiTrash2,
  FiUsers, FiCalendar, FiChevronRight, FiActivity, FiAward,
  FiSearch, FiFilter
} from 'react-icons/fi';

const CLUB_CATEGORIES = [
  { name: 'Academic', emoji: '📚', color: '#6366f1', bg: '#eef2ff' },
  { name: 'Sports', emoji: '⚽', color: '#16a34a', bg: '#f0fdf4' },
  { name: 'Arts & Culture', emoji: '🎨', color: '#d97706', bg: '#fffbeb' },
  { name: 'Technology', emoji: '💻', color: '#0891b2', bg: '#e0f2fe' },
  { name: 'Religious', emoji: '✝️', color: '#7c3aed', bg: '#f5f3ff' },
  { name: 'Community Service', emoji: '🤝', color: '#059669', bg: '#ecfdf5' },
  { name: 'Leadership', emoji: '👑', color: '#b45309', bg: '#fef3c7' },
  { name: 'Environmental', emoji: '🌱', color: '#15803d', bg: '#f0fdf4' },
];

const MEETING_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function ClubsPage() {
  const [view, setView] = useState<'clubs' | 'members' | 'meetings' | 'events'>('clubs');
  const [clubs, setClubs] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [showClubModal, setShowClubModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const emptyClub = {
    name: '', category: 'Academic', description: '', patron_id: 0,
    meeting_day: 'Friday', meeting_time: '3:00 PM', meeting_venue: '',
    subscription_fee: 0, max_members: 30, status: 'Active',
  };
  const [clubForm, setClubForm] = useState(emptyClub);

  const emptyMeeting = {
    club_id: 0, meeting_date: new Date().toISOString().split('T')[0],
    topic: '', venue: '', minutes: '', attendance_count: 0,
  };
  const [meetingForm, setMeetingForm] = useState(emptyMeeting);

  const [memberForm, setMemberForm] = useState({ student_id: 0, role: 'Member' });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [clubsR, teachersR, studentsR, membersR, meetingsR] = await Promise.all([
      supabase.from('school_clubs').select('*').order('name'),
      supabase.from('school_teachers').select('id, full_name').eq('status', 'Active').order('full_name'),
      supabase.from('school_students').select('id, first_name, last_name, form_id').eq('status', 'Active').order('first_name'),
      supabase.from('school_club_members').select('*, school_students(first_name, last_name, form_id), school_clubs(name)'),
      supabase.from('school_club_meetings').select('*, school_clubs(name)').order('meeting_date', { ascending: false }).limit(50),
    ]);
    setClubs(clubsR.data || []);
    setTeachers(teachersR.data || []);
    setStudents(studentsR.data || []);
    setMembers(membersR.data || []);
    setMeetings(meetingsR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveClub = async () => {
    if (!clubForm.name.trim()) { toast.error('Club name required'); return; }
    setSaving(true);
    const patron = teachers.find(t => t.id === Number(clubForm.patron_id));
    const payload = { ...clubForm, patron_id: Number(clubForm.patron_id) || null, patron_name: patron?.full_name || null };
    const { error } = editId
      ? await supabase.from('school_clubs').update(payload).eq('id', editId)
      : await supabase.from('school_clubs').insert([payload]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success(editId ? '✅ Club updated' : '✅ Club created!');
    setShowClubModal(false); setClubForm(emptyClub); setEditId(null);
    setSaving(false); fetchAll();
  };

  const addMember = async () => {
    if (!memberForm.student_id || !selectedClub) return;
    setSaving(true);
    const { error } = await supabase.from('school_club_members').upsert([{
      club_id: selectedClub.id, student_id: Number(memberForm.student_id),
      role: memberForm.role, joined_date: new Date().toISOString().split('T')[0], status: 'Active',
    }], { onConflict: 'club_id,student_id' });
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Member added!');
    setShowMemberModal(false); setMemberForm({ student_id: 0, role: 'Member' });
    setSaving(false); fetchAll();
  };

  const saveMeeting = async () => {
    if (!meetingForm.topic || !meetingForm.club_id) { toast.error('Fill club and topic'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_club_meetings').insert([meetingForm]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Meeting recorded!');
    setShowMeetingModal(false); setMeetingForm(emptyMeeting);
    setSaving(false); fetchAll();
  };

  const deleteClub = async (id: number) => {
    if (!confirm('Delete this club and all its records?')) return;
    await supabase.from('school_clubs').delete().eq('id', id);
    toast.success('Club deleted'); if (selectedClub?.id === id) setSelectedClub(null); fetchAll();
  };

  const filteredClubs = clubs.filter(c =>
    (categoryFilter === 'All' || c.category === categoryFilter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) || (c.description || '').toLowerCase().includes(search.toLowerCase()))
  );

  const clubMembers = selectedClub ? members.filter(m => m.club_id === selectedClub.id) : [];
  const clubMeetings = selectedClub ? meetings.filter(m => m.club_id === selectedClub.id) : [];

  const totalMembers = members.filter(m => m.status === 'Active').length;
  const activeClubs = clubs.filter(c => c.status === 'Active').length;
  const meetingsThisMonth = meetings.filter(m => {
    const d = new Date(m.meeting_date); const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* ═══ HERO HEADER ═══ */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#059669 100%)' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-inner">🏅</div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold text-white">Clubs & Societies</h1>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[9px] font-black uppercase">Ultra</span>
                </div>
                <p className="text-emerald-200 text-sm">
                  <span className="font-black text-white">{activeClubs}</span> active clubs ·{' '}
                  <span className="font-black text-white">{totalMembers}</span> enrolled members ·{' '}
                  <span className="font-black text-white">{meetingsThisMonth}</span> meetings this month
                </p>
                <p className="text-emerald-300 text-xs mt-1">Co-curricular management, KSSSA competitions, club budgets</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => { setShowMeetingModal(true); setMeetingForm({ ...emptyMeeting, club_id: clubs[0]?.id || 0 }); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition">
                <FiCalendar size={14} /> Record Meeting
              </button>
              <button onClick={() => { setClubForm(emptyClub); setEditId(null); setShowClubModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-emerald-800 text-sm font-bold hover:bg-emerald-50 transition shadow">
                <FiPlus size={14} /> New Club
              </button>
            </div>
          </div>

          {/* Category quick stats */}
          <div className="mt-5 grid grid-cols-4 sm:grid-cols-8 gap-2">
            {CLUB_CATEGORIES.map(cat => {
              const count = clubs.filter(c => c.category === cat.name).length;
              return (
                <button key={cat.name} onClick={() => setCategoryFilter(cat.name === categoryFilter ? 'All' : cat.name)}
                  className={`rounded-xl p-2 text-center transition ${categoryFilter === cat.name ? 'bg-white shadow-md' : 'bg-white/10 hover:bg-white/20'}`}>
                  <div className="text-xl">{cat.emoji}</div>
                  <div className={`text-[9px] font-black mt-0.5 ${categoryFilter === cat.name ? 'text-gray-700' : 'text-white/80'}`}>{cat.name}</div>
                  <div className={`text-[9px] font-black ${categoryFilter === cat.name ? 'text-emerald-600' : 'text-white/60'}`}>{count}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ STATS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Clubs', value: clubs.length, color: '#6366f1', bg: '#eef2ff', icon: '🏅' },
          { label: 'Active Members', value: totalMembers, color: '#16a34a', bg: '#f0fdf4', icon: '👥' },
          { label: 'Meetings This Month', value: meetingsThisMonth, color: '#d97706', bg: '#fffbeb', icon: '📅' },
          { label: 'Categories', value: new Set(clubs.map(c => c.category)).size, color: '#7c3aed', bg: '#f5f3ff', icon: '🎯' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-gray-500 font-semibold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ═══ SEARCH ═══ */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
          <FiSearch className="text-gray-400" size={15} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search clubs by name or description…"
            className="flex-1 text-sm outline-none text-gray-700 bg-transparent" />
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          {['clubs', 'members', 'meetings'].map(v => (
            <button key={v} onClick={() => setView(v as any)}
              className={`px-4 py-2.5 text-xs font-bold capitalize transition ${view === v ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {v === 'clubs' ? '🏅 Clubs' : v === 'members' ? '👥 Members' : '📅 Meetings'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        </div>
      ) : view === 'clubs' ? (
        <>
          {/* ─── CLUBS GRID ─── */}
          {filteredClubs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="text-5xl mb-4">🏅</div>
              <h3 className="text-lg font-black text-gray-700 mb-2">No clubs yet!</h3>
              <p className="text-sm text-gray-400 mb-6">Create your first club — Drama, Football, Scouts, Debate, CU, Science Club…</p>
              <button onClick={() => setShowClubModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                <FiPlus size={14} /> Create First Club
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClubs.map(club => {
                const catCfg = CLUB_CATEGORIES.find(c => c.name === club.category) || CLUB_CATEGORIES[0];
                const memberCount = members.filter(m => m.club_id === club.id && m.status === 'Active').length;
                const lastMeeting = meetings.filter(m => m.club_id === club.id)[0];
                const fillPct = club.max_members ? Math.min(100, Math.round(memberCount / club.max_members * 100)) : 0;

                return (
                  <div key={club.id} className={`bg-white rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden group cursor-pointer ${selectedClub?.id === club.id ? 'ring-2 ring-emerald-400 border-emerald-300' : 'border-gray-100'}`}
                    onClick={() => setSelectedClub(selectedClub?.id === club.id ? null : club)}>
                    {/* Top bar */}
                    <div className="h-1.5" style={{ background: catCfg.color }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ background: catCfg.bg }}>
                            {catCfg.emoji}
                          </div>
                          <div>
                            <h3 className="font-black text-gray-800 text-sm leading-tight">{club.name}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5 inline-block"
                              style={{ background: catCfg.bg, color: catCfg.color }}>{club.category}</span>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${club.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {club.status}
                        </span>
                      </div>

                      {club.description && (
                        <p className="text-[11px] text-gray-500 leading-relaxed mb-3 line-clamp-2">{club.description}</p>
                      )}

                      {/* Details */}
                      <div className="space-y-1.5 mb-3">
                        {club.patron_name && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span>👨‍🏫</span><span>Patron: <span className="font-semibold text-gray-700">{club.patron_name}</span></span>
                          </div>
                        )}
                        {club.meeting_day && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-500">
                            <span>📅</span><span>{club.meeting_day}s at {club.meeting_time || '—'}</span>
                            {club.meeting_venue && <span>· {club.meeting_venue}</span>}
                          </div>
                        )}
                        {lastMeeting && (
                          <div className="flex items-center gap-2 text-[11px] text-gray-400">
                            <span>🕒</span><span>Last met: {new Date(lastMeeting.meeting_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</span>
                          </div>
                        )}
                      </div>

                      {/* Membership bar */}
                      <div className="mb-3">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                          <span>👥 {memberCount} member{memberCount !== 1 ? 's' : ''}</span>
                          {club.max_members && <span className={fillPct >= 90 ? 'text-red-500 font-bold' : ''}>{fillPct}% full</span>}
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-1.5 rounded-full transition-all"
                            style={{ width: `${fillPct}%`, background: fillPct >= 90 ? '#ef4444' : fillPct >= 70 ? '#f59e0b' : catCfg.color }} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-3 border-t border-gray-50">
                        <button onClick={e => { e.stopPropagation(); setSelectedClub(club); setShowMemberModal(true); }}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition"
                          style={{ background: catCfg.bg, color: catCfg.color }}>
                          <FiPlus size={11} /> Add Member
                        </button>
                        <button onClick={e => { e.stopPropagation(); setClubForm({ name: club.name, category: club.category, description: club.description || '', patron_id: club.patron_id || 0, meeting_day: club.meeting_day || 'Friday', meeting_time: club.meeting_time || '3:00 PM', meeting_venue: club.meeting_venue || '', subscription_fee: club.subscription_fee || 0, max_members: club.max_members || 30, status: club.status }); setEditId(club.id); setShowClubModal(true); }}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-500 hover:border-blue-200 transition">
                          <FiEdit2 size={12} />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteClub(club.id); }}
                          className="px-3 py-2 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded member list */}
                    {selectedClub?.id === club.id && (
                      <div className="border-t border-gray-100 bg-gray-50/60">
                        <div className="px-5 py-3 flex items-center justify-between">
                          <p className="text-[10px] font-black text-gray-500 uppercase">Members ({clubMembers.length})</p>
                          <button onClick={e => { e.stopPropagation(); setShowMemberModal(true); }}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-800">+ Add</button>
                        </div>
                        <div className="px-5 pb-3 space-y-1.5 max-h-32 overflow-y-auto">
                          {clubMembers.length === 0 ? (
                            <p className="text-[11px] text-gray-400">No members yet. Add the first member!</p>
                          ) : clubMembers.map(m => (
                            <div key={m.id} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-black"
                                  style={{ background: catCfg.color }}>
                                  {m.school_students?.first_name?.charAt(0)}
                                </div>
                                <p className="text-[11px] text-gray-700 font-medium">
                                  {m.school_students?.first_name} {m.school_students?.last_name}
                                </p>
                              </div>
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">{m.role}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : view === 'members' ? (
        /* ─── MEMBERS TABLE ─── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-gray-800">All Club Members</h3>
              <p className="text-xs text-gray-500 mt-0.5">{totalMembers} active memberships across {activeClubs} clubs</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Student', 'Club', 'Category', 'Role', 'Joined', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">No members yet. Add students to clubs first.</td></tr>
              ) : members.map(m => {
                const clubData = clubs.find(c => c.id === m.club_id);
                const catCfg = CLUB_CATEGORIES.find(c => c.name === clubData?.category) || CLUB_CATEGORIES[0];
                return (
                  <tr key={m.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black"
                          style={{ background: catCfg.color }}>
                          {m.school_students?.first_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 text-xs">{m.school_students?.first_name} {m.school_students?.last_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{catCfg.emoji}</span>
                        <span className="text-xs text-gray-700 font-semibold">{m.school_clubs?.name || clubData?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: catCfg.bg, color: catCfg.color }}>
                        {clubData?.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{m.role}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">{m.joined_date ? new Date(m.joined_date).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{m.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ─── MEETINGS ─── */
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-gray-800">Club Meeting Records</h3>
                <p className="text-xs text-gray-500">{meetings.length} meetings recorded · {meetingsThisMonth} this month</p>
              </div>
              <button onClick={() => { setMeetingForm({ ...emptyMeeting, club_id: clubs[0]?.id || 0 }); setShowMeetingModal(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition"
                style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                <FiPlus size={13} /> Record Meeting
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {meetings.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <FiCalendar size={36} className="mx-auto mb-3 text-gray-200" />
                  <p className="text-sm">No meetings recorded yet</p>
                </div>
              ) : meetings.map(m => {
                const clubData = clubs.find(c => c.id === m.club_id);
                const catCfg = CLUB_CATEGORIES.find(c => c.name === clubData?.category) || CLUB_CATEGORIES[0];
                return (
                  <div key={m.id} className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50/60 transition">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background: catCfg.bg }}>{catCfg.emoji}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-gray-800 text-sm">{m.topic}</p>
                          <p className="text-[11px] font-semibold mt-0.5" style={{ color: catCfg.color }}>{m.school_clubs?.name || clubData?.name}</p>
                          {m.venue && <p className="text-[10px] text-gray-400 mt-0.5">📍 {m.venue}</p>}
                          {m.minutes && <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 italic">"{m.minutes}"</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs font-bold text-gray-600">{new Date(m.meeting_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                          {m.attendance_count > 0 && (
                            <p className="text-[10px] text-gray-400 mt-0.5">👥 {m.attendance_count} attended</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ SQL SETUP ═══ */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup: Run this SQL in Supabase</summary>
        <code className="text-[10px] block bg-white rounded p-3 border border-gray-200 mt-3 overflow-x-auto whitespace-pre text-gray-700">{`CREATE TABLE IF NOT EXISTS school_clubs (
  id serial PRIMARY KEY, name text NOT NULL, category text,
  description text, patron_id int REFERENCES school_teachers(id),
  patron_name text, meeting_day text, meeting_time text,
  meeting_venue text, subscription_fee numeric DEFAULT 0,
  max_members int DEFAULT 30,
  status text DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Suspended')),
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_club_members (
  id serial PRIMARY KEY,
  club_id int REFERENCES school_clubs(id) ON DELETE CASCADE,
  student_id int REFERENCES school_students(id) ON DELETE CASCADE,
  role text DEFAULT 'Member', joined_date date DEFAULT CURRENT_DATE,
  status text DEFAULT 'Active',
  UNIQUE (club_id, student_id)
);
CREATE TABLE IF NOT EXISTS school_club_meetings (
  id serial PRIMARY KEY,
  club_id int REFERENCES school_clubs(id) ON DELETE CASCADE,
  meeting_date date NOT NULL, topic text NOT NULL,
  venue text, minutes text, attendance_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_club_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_clubs" ON school_clubs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_club_members" ON school_club_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_club_meetings" ON school_club_meetings FOR ALL USING (true) WITH CHECK (true);`}
        </code>
      </details>

      {/* ═══ CLUB MODAL ═══ */}
      {showClubModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10"
              style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{CLUB_CATEGORIES.find(c => c.name === clubForm.category)?.emoji || '🏅'}</span>
                <div>
                  <h2 className="font-black text-gray-800">{editId ? 'Edit Club' : 'Create New Club'}</h2>
                  <p className="text-[10px] text-gray-500">Fill in the details below</p>
                </div>
              </div>
              <button onClick={() => setShowClubModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Club Name *</label>
                <input value={clubForm.name} onChange={e => setClubForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Drama Club, Football Team, Science Club…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none" />
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {CLUB_CATEGORIES.map(cat => (
                    <button key={cat.name} onClick={() => setClubForm(f => ({ ...f, category: cat.name }))}
                      className={`p-2 rounded-xl border text-center transition ${clubForm.category === cat.name ? 'border-current shadow-md' : 'border-gray-200'}`}
                      style={clubForm.category === cat.name ? { background: cat.bg, borderColor: cat.color } : {}}>
                      <div className="text-xl">{cat.emoji}</div>
                      <div className="text-[9px] font-bold mt-0.5" style={{ color: clubForm.category === cat.name ? cat.color : '#6b7280' }}>{cat.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Description</label>
                <textarea value={clubForm.description} onChange={e => setClubForm(f => ({ ...f, description: e.target.value }))}
                  rows={2} placeholder="What does this club do?"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-300 outline-none resize-none" />
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Patron Teacher</label>
                <select value={clubForm.patron_id} onChange={e => setClubForm(f => ({ ...f, patron_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none">
                  <option value={0}>No patron assigned</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Meeting Day</label>
                  <select value={clubForm.meeting_day} onChange={e => setClubForm(f => ({ ...f, meeting_day: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none">
                    {MEETING_DAYS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Time</label>
                  <input value={clubForm.meeting_time} onChange={e => setClubForm(f => ({ ...f, meeting_time: e.target.value }))}
                    placeholder="3:00 PM"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Max Members</label>
                  <input type="number" value={clubForm.max_members} onChange={e => setClubForm(f => ({ ...f, max_members: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Venue</label>
                  <input value={clubForm.meeting_venue} onChange={e => setClubForm(f => ({ ...f, meeting_venue: e.target.value }))}
                    placeholder="Hall, Field, Library…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Subscription Fee (KES)</label>
                  <input type="number" value={clubForm.subscription_fee} onChange={e => setClubForm(f => ({ ...f, subscription_fee: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6 sticky bottom-0 bg-white pt-3 border-t border-gray-100">
              <button onClick={saveClub} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiCheck size={14} />}
                {editId ? 'Update Club' : 'Create Club'}
              </button>
              <button onClick={() => setShowClubModal(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ ADD MEMBER MODAL ═══ */}
      {showMemberModal && selectedClub && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50">
              <h2 className="font-black text-gray-800">Add Member — {selectedClub.name}</h2>
              <button onClick={() => setShowMemberModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Student *</label>
                <select value={memberForm.student_id} onChange={e => setMemberForm(f => ({ ...f, student_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-300 outline-none">
                  <option value={0}>Select student…</option>
                  {students.filter(s => !members.some(m => m.club_id === selectedClub.id && m.student_id === s.id)).map(s => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Role</label>
                <div className="flex flex-wrap gap-2">
                  {['Member', 'Secretary', 'Treasurer', 'Chairperson', 'Vice-Chair', 'Patron'].map(r => (
                    <button key={r} onClick={() => setMemberForm(f => ({ ...f, role: r }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${memberForm.role === r ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={addMember} disabled={saving || !memberForm.student_id}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                {saving ? '…' : '✅ Add Member'}
              </button>
              <button onClick={() => setShowMemberModal(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RECORD MEETING MODAL ═══ */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-green-50">
              <h2 className="font-black text-gray-800">📅 Record Club Meeting</h2>
              <button onClick={() => setShowMeetingModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Club *</label>
                <select value={meetingForm.club_id} onChange={e => setMeetingForm(f => ({ ...f, club_id: Number(e.target.value) }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300">
                  <option value={0}>Select club…</option>
                  {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Date</label>
                  <input type="date" value={meetingForm.meeting_date} onChange={e => setMeetingForm(f => ({ ...f, meeting_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Attendance Count</label>
                  <input type="number" value={meetingForm.attendance_count} onChange={e => setMeetingForm(f => ({ ...f, attendance_count: Number(e.target.value) }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Topic / Agenda *</label>
                <input value={meetingForm.topic} onChange={e => setMeetingForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. Rehearsal for cultural day, Planning KSSSA…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Venue</label>
                <input value={meetingForm.venue} onChange={e => setMeetingForm(f => ({ ...f, venue: e.target.value }))}
                  placeholder="Hall, Field…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Minutes / Notes</label>
                <textarea value={meetingForm.minutes} onChange={e => setMeetingForm(f => ({ ...f, minutes: e.target.value }))}
                  rows={2} placeholder="Summary of decisions made, action items…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveMeeting} disabled={saving}
                className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#059669,#047857)' }}>
                {saving ? '…' : '✅ Save Meeting Record'}
              </button>
              <button onClick={() => setShowMeetingModal(false)} className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiPlus, FiX, FiCheck, FiRefreshCw, FiEdit2, FiTrash2, FiFileText, FiUsers, FiCalendar } from 'react-icons/fi';

const RESOLUTION_STATUS = ['Pending','In Progress','Completed','Deferred','Rejected'];

export default function BogPage() {
  const [tab, setTab] = useState<'meetings'|'members'|'resolutions'|'docs'>('meetings');
  const [meetings, setMeetings] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showResModal, setShowResModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any>(null);

  const emptyMeeting = { meeting_date: new Date().toISOString().split('T')[0], meeting_type: 'Ordinary', venue: 'Board Room', agenda: '', quorum: 0, status: 'Scheduled', minutes: '' };
  const emptyMember = { full_name: '', role: 'Member', phone: '', email: '', appointed_date: new Date().toISOString().split('T')[0], term_end: '', status: 'Active' };
  const emptyRes = { meeting_id: 0, resolution_text: '', action_owner: '', deadline: '', status: 'Pending', notes: '' };
  const [meetingForm, setMeetingForm] = useState(emptyMeeting);
  const [memberForm, setMemberForm] = useState(emptyMember);
  const [resForm, setResForm] = useState(emptyRes);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mr, memR, resR] = await Promise.all([
      supabase.from('school_bog_meetings').select('*').order('meeting_date', { ascending: false }),
      supabase.from('school_bog_members').select('*').order('role'),
      supabase.from('school_bog_resolutions').select('*, school_bog_meetings(meeting_date,meeting_type)').order('created_at', { ascending: false }),
    ]);
    setMeetings(mr.data || []);
    setMembers(memR.data || []);
    setResolutions(resR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveMeeting = async () => {
    setSaving(true);
    const { error } = await supabase.from('school_bog_meetings').insert([meetingForm]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Meeting recorded'); setShowMeetingModal(false); setMeetingForm(emptyMeeting); setSaving(false); fetchAll();
  };

  const saveMember = async () => {
    if (!memberForm.full_name) { toast.error('Name required'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_bog_members').insert([memberForm]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Member added'); setShowMemberModal(false); setMemberForm(emptyMember); setSaving(false); fetchAll();
  };

  const saveRes = async () => {
    if (!resForm.resolution_text) { toast.error('Enter resolution text'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_bog_resolutions').insert([{ ...resForm, meeting_id: selectedMeeting?.id || null }]);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Resolution saved'); setShowResModal(false); setResForm(emptyRes); setSaving(false); fetchAll();
  };

  const updateResStatus = async (id: number, status: string) => {
    await supabase.from('school_bog_resolutions').update({ status }).eq('id', id);
    setResolutions(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    toast.success(`Resolution marked as ${status}`);
  };

  const STATUS_CFG: Record<string,{color:string;bg:string}> = {
    Pending: {color:'#d97706',bg:'#fffbeb'}, 'In Progress': {color:'#2563eb',bg:'#eff6ff'},
    Completed: {color:'#16a34a',bg:'#f0fdf4'}, Deferred: {color:'#6b7280',bg:'#f9fafb'},
    Rejected: {color:'#dc2626',bg:'#fef2f2'},
  };

  const MEETING_STATUS: Record<string,{color:string;bg:string}> = {
    Scheduled: {color:'#2563eb',bg:'#eff6ff'}, Held: {color:'#16a34a',bg:'#f0fdf4'},
    Cancelled: {color:'#dc2626',bg:'#fef2f2'}, Postponed: {color:'#d97706',bg:'#fffbeb'},
  };

  const MEMBER_ROLES = ['Chairperson','Vice-Chairperson','Secretary','Treasurer','Member','Principal (Secretary)','Parent Representative','Community Representative'];

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#0c1a3e,#1e3a8a,#1d4ed8)' }}>
        <div className="px-6 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">🏛️</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white">Board of Governors</h1>
              <p className="text-blue-200 text-sm">{members.length} BoG members · {meetings.length} meetings recorded · {resolutions.filter(r=>r.status==='Pending').length} pending resolutions</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowMeetingModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition">
              <FiCalendar size={14} /> Record Meeting
            </button>
            <button onClick={() => setShowMemberModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-800 text-sm font-bold hover:bg-blue-50 transition shadow">
              <FiPlus size={14} /> Add Member
            </button>
          </div>
        </div>
        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 px-6 pb-5">
          {[
            { label: 'Total Meetings', value: meetings.length, icon: '📅' },
            { label: 'BoG Members', value: members.length, icon: '👔' },
            { label: 'Resolutions', value: resolutions.length, icon: '📋' },
            { label: 'Pending Actions', value: resolutions.filter(r=>r.status==='Pending').length, icon: '⏳' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-black text-white">{s.value}</div>
              <div className="text-[9px] text-blue-200">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm w-fit">
        {([['meetings','📅 Meetings'],['members','👔 Members'],['resolutions','📋 Resolutions']] as const).map(([v,l])=>(
          <button key={v} onClick={() => setTab(v)}
            className={`px-5 py-2.5 text-sm font-bold transition ${tab===v?'bg-blue-700 text-white':'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /></div>
      ) : tab === 'meetings' ? (
        <div className="space-y-3">
          {meetings.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
              <div className="text-5xl mb-3">🏛️</div>
              <p className="font-black text-gray-600 mb-4">No BoG meetings recorded yet</p>
              <button onClick={() => setShowMeetingModal(true)} className="px-6 py-3 rounded-xl text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)' }}>Record First Meeting</button>
            </div>
          ) : meetings.map(m => {
            const mCfg = MEETING_STATUS[m.status] || MEETING_STATUS.Scheduled;
            const mResolutions = resolutions.filter(r => r.meeting_id === m.id);
            return (
              <div key={m.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between border-b border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl">🏛️</div>
                    <div>
                      <p className="font-black text-gray-800">{m.meeting_type} Board Meeting</p>
                      <p className="text-sm text-gray-500">{new Date(m.meeting_date).toLocaleDateString('en-KE',{weekday:'long',day:'numeric',month:'long',year:'numeric'})} · {m.venue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: mCfg.bg, color: mCfg.color }}>{m.status}</span>
                    <button onClick={() => { setSelectedMeeting(m); setResForm({...emptyRes,meeting_id:m.id}); setShowResModal(true); }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition">
                      <FiPlus size={11} /> Resolution
                    </button>
                  </div>
                </div>
                {m.agenda && <div className="px-5 py-3 border-b border-gray-50"><p className="text-xs text-gray-500 font-semibold">📋 Agenda: </p><p className="text-xs text-gray-700 mt-0.5">{m.agenda}</p></div>}
                {m.minutes && <div className="px-5 py-3 border-b border-gray-50"><p className="text-xs text-gray-500 font-semibold">📝 Minutes Summary: </p><p className="text-xs text-gray-700 mt-0.5 line-clamp-3">{m.minutes}</p></div>}
                {mResolutions.length > 0 && (
                  <div className="px-5 py-3">
                    <p className="text-[10px] font-black text-gray-500 uppercase mb-2">Resolutions ({mResolutions.length})</p>
                    <div className="space-y-2">
                      {mResolutions.map(r => {
                        const rCfg = STATUS_CFG[r.status] || STATUS_CFG.Pending;
                        return (
                          <div key={r.id} className="flex items-start gap-3 p-2 rounded-xl bg-gray-50">
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 flex-shrink-0" style={{ background: rCfg.bg, color: rCfg.color }}>{r.status}</span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-700">{r.resolution_text}</p>
                              {r.action_owner && <p className="text-[10px] text-gray-400 mt-0.5">👤 {r.action_owner} {r.deadline && `· Due: ${new Date(r.deadline).toLocaleDateString('en-KE',{day:'2-digit',month:'short'})}`}</p>}
                            </div>
                            <select value={r.status} onChange={e => updateResStatus(r.id, e.target.value)}
                              className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 outline-none">
                              {RESOLUTION_STATUS.map(s => <option key={s}>{s}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : tab === 'members' ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">Board Members</h3><p className="text-xs text-gray-500">{members.length} members</p></div>
            <button onClick={() => setShowMemberModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:'linear-gradient(135deg,#1d4ed8,#1e40af)'}}>
              <FiPlus size={13} /> Add Member
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {members.length === 0 ? <div className="py-12 text-center text-gray-400 text-sm">No BoG members added yet</div>
            : members.map(m => (
              <div key={m.id} className="px-5 py-4 flex items-center gap-4 hover:bg-blue-50/20 transition">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-base flex-shrink-0">
                  {m.full_name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-black text-gray-800">{m.full_name}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{m.role}</span>
                    {m.status === 'Active' ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span>
                    : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  {m.phone && <p>📞 {m.phone}</p>}
                  {m.email && <p>✉️ {m.email}</p>}
                  {m.term_end && <p className="text-[10px] text-gray-400 mt-0.5">Ends: {new Date(m.term_end).toLocaleDateString('en-KE',{month:'short',year:'numeric'})}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* RESOLUTIONS */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div><h3 className="font-black text-gray-800">All Resolutions</h3><p className="text-xs text-gray-500">{resolutions.filter(r=>r.status==='Pending').length} pending · {resolutions.filter(r=>r.status==='Completed').length} completed</p></div>
            <button onClick={() => setShowResModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:'linear-gradient(135deg,#1d4ed8,#1e40af)'}}>
              <FiPlus size={13} /> Add Resolution
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {resolutions.map(r => {
              const rCfg = STATUS_CFG[r.status] || STATUS_CFG.Pending;
              return (
                <div key={r.id} className="px-5 py-4 flex items-start gap-4 hover:bg-blue-50/20 transition">
                  <span className="text-[9px] font-black px-2 py-1 rounded-full mt-0.5 flex-shrink-0" style={{background:rCfg.bg,color:rCfg.color}}>{r.status}</span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{r.resolution_text}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-gray-500">
                      {r.action_owner && <span>👤 {r.action_owner}</span>}
                      {r.deadline && <span>📅 Due: {new Date(r.deadline).toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'})}</span>}
                      {r.school_bog_meetings && <span>📋 {r.school_bog_meetings.meeting_type} — {new Date(r.school_bog_meetings.meeting_date).toLocaleDateString('en-KE',{day:'numeric',month:'short'})}</span>}
                    </div>
                  </div>
                  <select value={r.status} onChange={e => updateResStatus(r.id,e.target.value)}
                    className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300">
                    {RESOLUTION_STATUS.map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              );
            })}
            {resolutions.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">No resolutions yet</div>}
          </div>
        </div>
      )}

      {/* SQL */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_bog_meetings (
  id serial PRIMARY KEY, meeting_date date NOT NULL,
  meeting_type text DEFAULT 'Ordinary', venue text, agenda text,
  minutes text, quorum int DEFAULT 0,
  status text DEFAULT 'Scheduled', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_bog_members (
  id serial PRIMARY KEY, full_name text NOT NULL, role text,
  phone text, email text, appointed_date date,
  term_end date, status text DEFAULT 'Active', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_bog_resolutions (
  id serial PRIMARY KEY,
  meeting_id int REFERENCES school_bog_meetings(id),
  resolution_text text NOT NULL, action_owner text, deadline date,
  status text DEFAULT 'Pending', notes text, created_at timestamptz DEFAULT now()
);
ALTER TABLE school_bog_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_bog_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_bog_resolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_bog_meetings" ON school_bog_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_bog_members" ON school_bog_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all_bog_resolutions" ON school_bog_resolutions FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {/* Meeting Modal */}
      {showMeetingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="font-black text-gray-800">🏛️ Record BoG Meeting</h2>
              <button onClick={() => setShowMeetingModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[{l:'Date',k:'meeting_date',t:'date'},{l:'Venue',k:'venue',t:'text',ph:'Board Room, School Hall…'},{l:'Agenda',k:'agenda',t:'textarea',ph:'1. Confirmation of previous minutes\n2. Financial report…'}].map(f=>(
                <div key={f.k}>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">{f.l}</label>
                  {f.t==='textarea'
                    ? <textarea value={(meetingForm as any)[f.k]} onChange={e=>setMeetingForm(prev=>({...prev,[f.k]:e.target.value}))} placeholder={f.ph} rows={3} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
                    : <input type={f.t} value={(meetingForm as any)[f.k]} onChange={e=>setMeetingForm(prev=>({...prev,[f.k]:e.target.value}))} placeholder={f.ph||''} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />}
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Type</label>
                  <select value={meetingForm.meeting_type} onChange={e=>setMeetingForm(f=>({...f,meeting_type:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                    {['Ordinary','Special','Emergency','Annual'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Status</label>
                  <select value={meetingForm.status} onChange={e=>setMeetingForm(f=>({...f,status:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                    {['Scheduled','Held','Cancelled','Postponed'].map(o=><option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Minutes Summary</label>
                <textarea value={meetingForm.minutes} onChange={e=>setMeetingForm(f=>({...f,minutes:e.target.value}))} rows={3} placeholder="Summary of key decisions made…" className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveMeeting} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{background:'linear-gradient(135deg,#1d4ed8,#1e40af)'}}>
                {saving ? '…' : '✅ Save Meeting'}
              </button>
              <button onClick={() => setShowMeetingModal(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="font-black text-gray-800">👔 Add BoG Member</h2>
              <button onClick={() => setShowMemberModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Full Name *</label>
                <input value={memberForm.full_name} onChange={e=>setMemberForm(f=>({...f,full_name:e.target.value}))} placeholder="e.g. Mr. John Kamau" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Role</label>
                <select value={memberForm.role} onChange={e=>setMemberForm(f=>({...f,role:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                  {MEMBER_ROLES.map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Phone</label>
                  <input value={memberForm.phone} onChange={e=>setMemberForm(f=>({...f,phone:e.target.value}))} placeholder="07XX XXX XXX" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Email</label>
                  <input value={memberForm.email} onChange={e=>setMemberForm(f=>({...f,email:e.target.value}))} placeholder="email@…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Appointed</label>
                  <input type="date" value={memberForm.appointed_date} onChange={e=>setMemberForm(f=>({...f,appointed_date:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Term Ends</label>
                  <input type="date" value={memberForm.term_end} onChange={e=>setMemberForm(f=>({...f,term_end:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveMember} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{background:'linear-gradient(135deg,#1d4ed8,#1e40af)'}}>
                {saving?'…':'✅ Add Member'}
              </button>
              <button onClick={()=>setShowMemberModal(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Resolution Modal */}
      {showResModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="font-black text-gray-800">📋 Add Resolution</h2>
              <button onClick={()=>setShowResModal(false)} className="text-gray-400 hover:text-gray-600"><FiX size={18}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Meeting</label>
                <select value={selectedMeeting?.id||0} onChange={e=>{const m=meetings.find(x=>x.id===Number(e.target.value));setSelectedMeeting(m||null);setResForm(f=>({...f,meeting_id:Number(e.target.value)}));}} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                  <option value={0}>Select meeting…</option>
                  {meetings.map(m=><option key={m.id} value={m.id}>{m.meeting_type} — {new Date(m.meeting_date).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'})}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Resolution Text *</label>
                <textarea value={resForm.resolution_text} onChange={e=>setResForm(f=>({...f,resolution_text:e.target.value}))} rows={3} placeholder="e.g. The Board resolved that a new laboratory be constructed by December…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Action Owner</label>
                  <input value={resForm.action_owner} onChange={e=>setResForm(f=>({...f,action_owner:e.target.value}))} placeholder="Principal, Bursar…" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-600 block mb-1.5">Deadline</label>
                  <input type="date" value={resForm.deadline} onChange={e=>setResForm(f=>({...f,deadline:e.target.value}))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={saveRes} disabled={saving} className="flex-1 py-3 rounded-xl text-white font-bold text-sm disabled:opacity-60" style={{background:'linear-gradient(135deg,#1d4ed8,#1e40af)'}}>
                {saving?'…':'✅ Save Resolution'}
              </button>
              <button onClick={()=>setShowResModal(false)} className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

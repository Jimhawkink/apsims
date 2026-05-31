'use client';
import { useState, useEffect, useCallback } from 'react';
import { useTimetable } from './TimetableProvider';
import { DAYS } from './timetable-colors';
import type { Entry } from './timetable-types';
import toast from 'react-hot-toast';
import {
  FiSave, FiClock, FiTrash2, FiRefreshCw, FiCheck, FiX,
  FiMessageSquare, FiSend, FiPhone, FiUsers, FiAlertCircle,
  FiDownload, FiCopy, FiCheckCircle, FiLoader,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════
// TIMETABLE SNAPSHOTS — Save/Restore versions
// ═══════════════════════════════════════════════════════════════════
interface Snapshot {
  id?: number;
  snapshot_name: string;
  snapshot_note?: string;
  term: string;
  year: number;
  entry_count: number;
  entries_json: string;
  created_at?: string;
  created_by?: string;
}

export function SnapshotsTab() {
  const { termEntries, bTerm, bYear, fetchAll } = useTimetable();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [showForm, setShowForm] = useState(false);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('school_timetable_snapshots')
        .select('*')
        .eq('term', bTerm)
        .eq('year', bYear)
        .order('created_at', { ascending: false });
      setSnapshots(data || []);
    } catch {
      // Table may not exist yet
      setSnapshots([]);
    }
    setLoading(false);
  }, [bTerm, bYear]);

  useEffect(() => { loadSnapshots(); }, [loadSnapshots]);

  const saveSnapshot = async () => {
    if (!name.trim()) { toast.error('Enter a snapshot name'); return; }
    if (!termEntries.length) { toast.error('No entries to save'); return; }
    setSaving(true);
    try {
      const snapshot: Omit<Snapshot, 'id'> = {
        snapshot_name: name.trim(),
        snapshot_note: note.trim() || undefined,
        term: bTerm, year: bYear,
        entry_count: termEntries.length,
        entries_json: JSON.stringify(termEntries),
      };
      const { error } = await supabase.from('school_timetable_snapshots').insert([snapshot]);
      if (error) {
        // Fallback: save to localStorage if table doesn't exist
        const key = `apsims_snapshot_${bTerm}_${bYear}_${Date.now()}`;
        localStorage.setItem(key, JSON.stringify({ ...snapshot, created_at: new Date().toISOString() }));
        toast.success('Snapshot saved locally ✓');
      } else {
        toast.success(`Snapshot "${name}" saved ✓`);
      }
      setName(''); setNote(''); setShowForm(false);
      loadSnapshots();
    } catch {
      toast.error('Failed to save snapshot');
    }
    setSaving(false);
  };

  const restoreSnapshot = async (snap: Snapshot) => {
    if (!confirm(`Restore "${snap.snapshot_name}"?\n\nThis will REPLACE your current ${bTerm} ${bYear} timetable with ${snap.entry_count} entries from this snapshot.\n\nCurrent entries will be lost unless saved as a snapshot first.`)) return;
    setRestoring(snap.id || -1);
    try {
      const entries: Entry[] = JSON.parse(snap.entries_json);
      // Delete current entries for this term/year
      const { error: delErr } = await supabase
        .from('school_timetable_entries')
        .delete()
        .eq('term', bTerm)
        .eq('year', bYear);
      if (delErr) throw delErr;
      // Re-insert snapshot entries in batches
      const batch = 50;
      for (let i = 0; i < entries.length; i += batch) {
        const chunk = entries.slice(i, i + batch).map(({ id: _, ...e }) => e);
        const { error } = await supabase.from('school_timetable_entries').insert(chunk);
        if (error) throw error;
      }
      toast.success(`✓ Restored "${snap.snapshot_name}" — ${entries.length} lessons`);
      fetchAll();
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`);
    }
    setRestoring(null);
  };

  const deleteSnapshot = async (snap: Snapshot) => {
    if (!confirm(`Delete snapshot "${snap.snapshot_name}"? This cannot be undone.`)) return;
    if (snap.id) {
      await supabase.from('school_timetable_snapshots').delete().eq('id', snap.id);
    }
    toast.success('Snapshot deleted');
    loadSnapshots();
  };

  const exportSnapshotCSV = (snap: Snapshot) => {
    try {
      const entries: Entry[] = JSON.parse(snap.entries_json);
      const csv = ['Day,Period ID,Form,Stream,Subject,Teacher,Room,Double']
        .concat(entries.map(e =>
          `"${e.day_of_week}","${e.period_id}","${e.form_id}","${e.stream_id}","${e.subject_id}","${e.teacher_id || ''}","${e.room || ''}","${e.is_double}"`
        )).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = `timetable_${snap.snapshot_name.replace(/\s+/g, '_')}_${bTerm}_${bYear}.csv`;
      a.click();
    } catch { toast.error('Export failed'); }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">📸 Timetable Snapshots</h1>
          <p className="text-sm text-gray-500 mt-0.5">Save and restore timetable versions — never lose your work again</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadSnapshots} className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 flex items-center gap-1.5 hover:bg-gray-50">
            <FiRefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowForm(!showForm)}
            className="px-4 py-2.5 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-md"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
            <FiSave size={15} /> Save Snapshot
          </button>
        </div>
      </div>

      {/* Current state info */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100 p-5">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1">
            <h3 className="text-sm font-bold text-indigo-800">Current Timetable State</h3>
            <p className="text-xs text-indigo-600 mt-1">{bTerm} {bYear} · {termEntries.length} lessons placed</p>
          </div>
          <div className="flex gap-3">
            <div className="text-center bg-white rounded-xl px-4 py-2 border border-indigo-100">
              <p className="text-2xl font-black text-indigo-700">{termEntries.length}</p>
              <p className="text-[10px] text-indigo-500 font-bold uppercase">Lessons</p>
            </div>
            <div className="text-center bg-white rounded-xl px-4 py-2 border border-indigo-100">
              <p className="text-2xl font-black text-purple-700">{snapshots.length}</p>
              <p className="text-[10px] text-purple-500 font-bold uppercase">Saved Versions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FiSave className="text-indigo-500" size={15} /> Save Current Timetable as Snapshot
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Snapshot Name *</label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder='e.g. "After adding Sports period" or "v1 - Initial"'
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase block mb-1">Note (optional)</label>
              <input value={note} onChange={e => setNote(e.target.value)}
                placeholder="Describe what changed..."
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-indigo-400 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={saveSnapshot} disabled={saving}
              className="px-5 py-2 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-md disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
              {saving ? <><FiRefreshCw size={14} className="animate-spin" /> Saving...</> : <><FiSave size={14} /> Save {termEntries.length} Lessons</>}
            </button>
          </div>
        </div>
      )}

      {/* Snapshots list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-indigo-50/30">
          <h3 className="text-sm font-bold text-gray-800">Saved Snapshots — {bTerm} {bYear}</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-gray-400">
            <FiRefreshCw size={24} className="mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading snapshots...</p>
          </div>
        ) : snapshots.length === 0 ? (
          <div className="p-12 text-center">
            <FiSave size={40} className="mx-auto mb-3 text-gray-200" />
            <p className="text-base font-bold text-gray-400">No snapshots yet</p>
            <p className="text-sm text-gray-300 mt-1">Save a snapshot before making changes — you can always restore it</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {snapshots.map((snap, i) => (
              <div key={snap.id || i} className="p-5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl"
                  style={{ background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)' }}>
                  📸
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{snap.snapshot_name}</p>
                  {snap.snapshot_note && <p className="text-xs text-gray-500 mt-0.5">{snap.snapshot_note}</p>}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-indigo-600 font-bold">{snap.entry_count} lessons</span>
                    <span className="text-xs text-gray-400">
                      <FiClock size={10} className="inline mr-1" />
                      {snap.created_at ? new Date(snap.created_at).toLocaleString('en-KE') : 'Just now'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => exportSnapshotCSV(snap)}
                    className="p-2 rounded-xl text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Export CSV">
                    <FiDownload size={15} />
                  </button>
                  <button onClick={() => restoreSnapshot(snap)} disabled={restoring === snap.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-all flex items-center gap-1.5 disabled:opacity-50"
                    title="Restore this version">
                    {restoring === snap.id ? <FiRefreshCw size={12} className="animate-spin" /> : <FiCheck size={12} />}
                    Restore
                  </button>
                  <button onClick={() => deleteSnapshot(snap)}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                    <FiTrash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// DISTRIBUTION TAB — Send timetable via WhatsApp & SMS
// ═══════════════════════════════════════════════════════════════════
interface SendResult { teacherName: string; phone: string; status: 'sent' | 'failed' | 'skipped'; reason?: string; }

export function DistributeTab() {
  const { teachers, termEntries, classStats, bTerm, bYear,
    getTeacherName, getSubjectName, getFormName, getStreamName,
    allPeriodsSorted, lessonPeriods } = useTimetable();

  const [channel, setChannel] = useState<'sms' | 'whatsapp' | 'both'>('whatsapp');
  const [template, setTemplate] = useState(0);
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SendResult[]>([]);
  const [selectedTeachers, setSelectedTeachers] = useState<Set<number>>(new Set());
  const [selectAll, setSelectAll] = useState(true);

  const teachersWithAssignments = teachers.filter(t =>
    termEntries.some(e => e.teacher_id === t.id)
  );

  const TEMPLATES = [
    {
      name: '📅 Your Timetable',
      msg: (t: any) => `Dear ${t.first_name} ${t.last_name},\n\nYour ${bTerm} ${bYear} timetable is ready:\n\n${buildTeacherScheduleText(t.id)}\n\nPlease report any errors to the Deputy Principal.\n\nRegards,\nSchool Administration`,
    },
    {
      name: '🔔 Timetable Ready',
      msg: (t: any) => `Hello ${t.first_name},\n\nThe ${bTerm} ${bYear} school timetable has been finalized. You have ${termEntries.filter(e => e.teacher_id === t.id).length} lessons scheduled this term.\n\nPlease check the noticeboards or visit the staffroom for your printed timetable.\n\n- School Administration`,
    },
    {
      name: '⚠️ Timetable Change',
      msg: (t: any) => `NOTICE: Dear ${t.first_name} ${t.last_name},\n\nYour ${bTerm} ${bYear} timetable has been UPDATED. Please collect your new timetable from the Deputy Principal's office.\n\nTotal lessons: ${termEntries.filter(e => e.teacher_id === t.id).length}\n\n- Timetable Office`,
    },
  ];

  const buildTeacherScheduleText = (teacherId: number): string => {
    const lines: string[] = [];
    DAYS.forEach(day => {
      const dayEntries = termEntries
        .filter(e => e.teacher_id === teacherId && e.day_of_week === day)
        .sort((a, b) => {
          const pa = allPeriodsSorted.find(p => p.id === a.period_id);
          const pb = allPeriodsSorted.find(p => p.id === b.period_id);
          return (pa?.period_number || 0) - (pb?.period_number || 0);
        });
      if (dayEntries.length) {
        lines.push(`${day.toUpperCase()}:`);
        dayEntries.forEach(e => {
          const period = allPeriodsSorted.find(p => p.id === e.period_id);
          const subj = getSubjectName(e.subject_id);
          const cls = `${getFormName(e.form_id)} ${getStreamName(e.stream_id)}`;
          lines.push(`  ${period?.period_name || `P${e.period_id}`}: ${subj} — ${cls}${e.room ? ` (${e.room})` : ''}`);
        });
      }
    });
    return lines.join('\n') || 'No lessons assigned yet.';
  };

  useEffect(() => {
    if (selectAll) {
      setSelectedTeachers(new Set(teachersWithAssignments.map(t => t.id)));
    } else {
      setSelectedTeachers(new Set());
    }
  }, [selectAll, teachersWithAssignments.length]);

  const toggleTeacher = (id: number) => {
    setSelectedTeachers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const sendCampaign = async () => {
    const targets = teachersWithAssignments.filter(t => selectedTeachers.has(t.id));
    if (!targets.length) { toast.error('No teachers selected'); return; }
    setSending(true); setProgress(0); setResults([]);

    const res: SendResult[] = [];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const phone = (t as any).phone;
      const msgFn = template < TEMPLATES.length ? TEMPLATES[template].msg : () => customMsg;
      const message = msgFn(t);

      if (!phone) {
        res.push({ teacherName: getTeacherName(t.id), phone: 'N/A', status: 'skipped', reason: 'No phone number on record' });
        setProgress(Math.round((i + 1) / targets.length * 100));
        continue;
      }

      try {
        if (channel === 'sms' || channel === 'both') {
          await fetch('/api/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message }),
          });
        }
        if (channel === 'whatsapp' || channel === 'both') {
          await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message }),
          });
        }
        res.push({ teacherName: getTeacherName(t.id), phone, status: 'sent' });
      } catch {
        res.push({ teacherName: getTeacherName(t.id), phone, status: 'failed', reason: 'Send error' });
      }

      setProgress(Math.round((i + 1) / targets.length * 100));
      setResults([...res]);
      await new Promise(r => setTimeout(r, 350)); // rate limiting
    }

    setSending(false);
    const sent = res.filter(r => r.status === 'sent').length;
    const failed = res.filter(r => r.status === 'failed').length;
    toast.success(`Campaign complete: ${sent} sent, ${failed} failed`);
  };

  const exportResultsCSV = () => {
    const csv = ['Teacher,Phone,Status,Reason']
      .concat(results.map(r => `"${r.teacherName}","${r.phone}","${r.status}","${r.reason || ''}"`)
      ).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `distribution_results_${bTerm}_${bYear}.csv`;
    a.click();
  };

  const copyMessage = (teacherId: number) => {
    const t = teachers.find(x => x.id === teacherId);
    if (!t) return;
    const msgFn = template < TEMPLATES.length ? TEMPLATES[template].msg : () => customMsg;
    navigator.clipboard.writeText(msgFn(t));
    toast.success('Message copied!');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-800">📱 Distribute Timetable</h1>
        <p className="text-sm text-gray-500 mt-0.5">Send timetable to teachers via WhatsApp or SMS — beats Zeraki</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Teachers with Assignments', val: teachersWithAssignments.length, color: '#1e40af', bg: '#eff6ff' },
          { label: 'Selected to Send', val: selectedTeachers.size, color: '#059669', bg: '#ecfdf5' },
          { label: 'Missing Phone', val: teachersWithAssignments.filter(t => !(t as any).phone).length, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Results', val: results.length, color: '#7c3aed', bg: '#f5f3ff' },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl p-4 border border-transparent" style={{ backgroundColor: s.bg }}>
            <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs font-bold mt-0.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Config */}
        <div className="space-y-4">
          {/* Channel selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">📡 Channel</h3>
            <div className="flex gap-2">
              {(['whatsapp', 'sms', 'both'] as const).map(c => (
                <button key={c} onClick={() => setChannel(c)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${channel === c ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  {c === 'whatsapp' ? '💬 WhatsApp' : c === 'sms' ? '📱 SMS' : '📲 Both'}
                </button>
              ))}
            </div>
          </div>

          {/* Template selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-3">✍️ Message Template</h3>
            <div className="space-y-2 mb-3">
              {TEMPLATES.map((tmpl, i) => (
                <button key={i} onClick={() => setTemplate(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${template === i ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                  {tmpl.name}
                </button>
              ))}
              <button onClick={() => setTemplate(TEMPLATES.length)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${template === TEMPLATES.length ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}>
                ✏️ Custom Message
              </button>
            </div>
            {template === TEMPLATES.length && (
              <textarea value={customMsg} onChange={e => setCustomMsg(e.target.value)}
                placeholder="Type your custom message... Use {teacher_name} for the teacher's name"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-purple-400 outline-none resize-none h-24" />
            )}

            {/* Preview for first teacher */}
            {teachersWithAssignments[0] && template < TEMPLATES.length && (
              <div className="mt-3">
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Preview (for {teachersWithAssignments[0].first_name})</p>
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-xs text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
                  {TEMPLATES[template].msg(teachersWithAssignments[0])}
                </div>
                <button onClick={() => copyMessage(teachersWithAssignments[0].id)}
                  className="mt-2 text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                  <FiCopy size={11} /> Copy message
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Teacher selector */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-green-50/30 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">👥 Select Recipients</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={selectAll} onChange={e => setSelectAll(e.target.checked)}
                className="w-4 h-4 accent-indigo-600" />
              <span className="text-xs font-bold text-gray-600">Select All</span>
            </label>
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {teachersWithAssignments.map(t => {
              const lessons = termEntries.filter(e => e.teacher_id === t.id).length;
              const hasPhone = !!(t as any).phone;
              return (
                <label key={t.id} className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50/50">
                  <input type="checkbox"
                    checked={selectedTeachers.has(t.id)}
                    onChange={() => toggleTeacher(t.id)}
                    className="w-4 h-4 accent-indigo-600" />
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0">
                    {t.first_name?.[0]}{t.last_name?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{t.first_name} {t.last_name}</p>
                    <p className="text-xs text-gray-400">{lessons} lessons</p>
                  </div>
                  <div className="flex-shrink-0">
                    {hasPhone
                      ? <span className="text-xs text-green-600 flex items-center gap-1"><FiPhone size={10} /> {(t as any).phone}</span>
                      : <span className="text-xs text-red-400 flex items-center gap-1"><FiAlertCircle size={10} /> No phone</span>
                    }
                  </div>
                </label>
              );
            })}
            {teachersWithAssignments.length === 0 && (
              <p className="text-center py-8 text-gray-400 text-sm">No teachers with assignments this term</p>
            )}
          </div>
        </div>
      </div>

      {/* Send button */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-gray-800">Ready to send to {selectedTeachers.size} teachers via {channel}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {teachersWithAssignments.filter(t => selectedTeachers.has(t.id) && !(t as any).phone).length} will be skipped (no phone number)
            </p>
          </div>
          <button onClick={sendCampaign} disabled={sending || selectedTeachers.size === 0}
            className="px-6 py-3 text-white rounded-xl text-sm font-black flex items-center gap-2.5 shadow-xl disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}>
            {sending ? (
              <><FiRefreshCw size={16} className="animate-spin" /> Sending {progress}%...</>
            ) : (
              <><FiSend size={16} /> Send {channel === 'whatsapp' ? '💬 WhatsApp' : channel === 'sms' ? '📱 SMS' : '📲 Both'} Now</>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {sending && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span>Sending to teachers...</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#059669,#10b981)' }} />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800">Distribution Results</h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-600 font-bold">{results.filter(r => r.status === 'sent').length} sent</span>
              <span className="text-xs text-red-500 font-bold">{results.filter(r => r.status === 'failed').length} failed</span>
              <span className="text-xs text-gray-400 font-bold">{results.filter(r => r.status === 'skipped').length} skipped</span>
              <button onClick={exportResultsCSV} className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                <FiDownload size={11} /> Export CSV
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${r.status === 'sent' ? 'bg-green-100' : r.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'}`}>
                  {r.status === 'sent' ? <FiCheckCircle size={12} className="text-green-600" /> : r.status === 'failed' ? <FiX size={12} className="text-red-500" /> : <FiAlertCircle size={12} className="text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{r.teacherName}</p>
                  <p className="text-xs text-gray-400">{r.phone}{r.reason ? ` · ${r.reason}` : ''}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.status === 'sent' ? 'bg-green-100 text-green-700' : r.status === 'failed' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                  {r.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

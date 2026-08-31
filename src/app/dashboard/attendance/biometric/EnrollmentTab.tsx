'use client';
import { useState, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
  FiSearch, FiUserCheck, FiUserX, FiUpload, FiDownload,
  FiUsers, FiZap, FiCheckCircle, FiX, FiSave, FiInfo,
} from 'react-icons/fi';
import { BiometricDevice, BiometricEnrollment } from '@/lib/biometric-types';

interface Student {
  id: number;
  first_name: string;
  last_name: string;
  admission_number: string;
  form_id: number;
  biometric_enrolled: boolean;
  biometric_device_user_id: string | null;
}

interface Props {
  devices: BiometricDevice[];
  enrollments: BiometricEnrollment[];
  students: Student[];
  onRefresh: () => void;
}

const ENROLL_TYPES = ['fingerprint', 'face', 'card', 'pin'];

export default function EnrollmentTab({ devices, enrollments, students, onRefresh }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enrolled' | 'not_enrolled'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [enrollForm, setEnrollForm] = useState({ device_user_id: '', enrollment_type: 'fingerprint', device_id: '' });
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const enrolled = students.filter(s => s.biometric_enrolled).length;
  const unenrolled = students.length - enrolled;
  const pct = students.length > 0 ? Math.round((enrolled / students.length) * 100) : 0;

  const filtered = useMemo(() => {
    let list = students;
    if (filterStatus === 'enrolled') list = list.filter(s => s.biometric_enrolled);
    if (filterStatus === 'not_enrolled') list = list.filter(s => !s.biometric_enrolled);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(s =>
      `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
      (s.admission_number || '').toLowerCase().includes(q)
    );
  }, [students, search, filterStatus]);

  // ── Open enroll modal (pre-fills PIN = admission_no) ──────────────────────
  const openEnroll = (s: Student) => {
    setSelectedStudent(s);
    setEnrollForm({
      device_user_id: s.admission_number || '',
      enrollment_type: 'fingerprint',
      device_id: devices[0]?.id?.toString() || '',
    });
    setShowModal(true);
  };

  // ── Save enrollment to school_biometric_registrations ─────────────────────
  const handleEnroll = async () => {
    if (!selectedStudent || !enrollForm.device_user_id.trim()) {
      toast.error('PIN / Device User ID is required'); return;
    }
    setSaving(true);
    try {
      const { error: regErr } = await supabase.from('school_biometric_registrations').upsert({
        person_type: 'student',
        person_id: selectedStudent.id,
        person_name: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
        biometric_pin: enrollForm.device_user_id.trim(),
        device_sn: enrollForm.device_id || null,
        enroll_method: enrollForm.enrollment_type,
        registered_by: (() => { try { return JSON.parse(localStorage.getItem('school_user') || '{}').full_name || 'Admin'; } catch { return 'Admin'; } })(),
        is_active: true,
      }, { onConflict: 'biometric_pin' });

      if (regErr) throw new Error(regErr.message);

      toast.success(`✅ ${selectedStudent.first_name} ${selectedStudent.last_name} enrolled! PIN: ${enrollForm.device_user_id}`);
      setShowModal(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || 'Enrollment failed');
    } finally { setSaving(false); }
  };

  // ── Auto-Enroll ALL students (PIN = admission_number) ─────────────────────
  const autoEnrollAll = async () => {
    setBulkLoading(true);
    const notEnrolled = students.filter(s => !s.biometric_enrolled && s.admission_number);
    if (notEnrolled.length === 0) { toast('All students already enrolled! 🎉'); setBulkLoading(false); return; }

    const rows = notEnrolled.map(s => ({
      person_type: 'student',
      person_id: s.id,
      person_name: `${s.first_name} ${s.last_name}`,
      biometric_pin: s.admission_number,
      enroll_method: 'fingerprint',
      is_active: true,
    }));

    // Save in batches of 50
    let success = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await supabase
        .from('school_biometric_registrations')
        .upsert(batch, { onConflict: 'biometric_pin' });
      if (!error) success += batch.length;
      else console.error('Batch error:', error.message);
    }

    if (success > 0) {
      toast.success(`✅ Auto-enrolled ${success} students! PIN = Admission Number`);
    } else {
      toast.error('Auto-enroll failed — check console for details');
    }
    setBulkLoading(false);
    onRefresh();
  };

  // ── Deactivate enrollment ──────────────────────────────────────────────────
  const handleDeactivate = async (student: Student) => {
    if (!confirm(`Remove biometric enrollment for ${student.first_name} ${student.last_name}?`)) return;
    await supabase.from('school_biometric_registrations')
      .update({ is_active: false })
      .eq('person_type', 'student').eq('person_id', student.id);
    toast.success('Enrollment removed');
    onRefresh();
  };

  // ── Download CSV template ──────────────────────────────────────────────────
  const downloadTemplate = () => {
    const headers = 'admission_number,device_user_id,enrollment_type\n';
    const example = students.slice(0, 3).map(s =>
      `${s.admission_number},${s.admission_number},fingerprint`
    ).join('\n');
    const fallback = 'ADM001,ADM001,fingerprint\nADM002,ADM002,face\nADM003,ADM003,card';
    const csv = '\uFEFF' + headers + (example || fallback);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'biometric_enrollment_template.csv'; a.click();
    toast.success('Template downloaded!');
  };

  // ── Bulk CSV upload ────────────────────────────────────────────────────────
  const handleCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const errors: string[] = []; let success = 0;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(s => s.trim().replace(/^"|"$/g, ''));
      const [admission_number, device_user_id, enrollment_type = 'fingerprint'] = cols;
      if (!admission_number || !device_user_id) { errors.push(`Row ${i + 1}: missing admission_number or device_user_id`); continue; }
      const student = students.find(s => s.admission_number === admission_number);
      if (!student) { errors.push(`Row ${i + 1}: student "${admission_number}" not found`); continue; }

      const { error } = await supabase.from('school_biometric_registrations').upsert({
        person_type: 'student', person_id: student.id,
        person_name: `${student.first_name} ${student.last_name}`,
        biometric_pin: device_user_id, enroll_method: enrollment_type, is_active: true,
      }, { onConflict: 'biometric_pin' });

      if (!error) success++;
      else errors.push(`Row ${i + 1}: ${error.message}`);
    }

    setCsvErrors(errors);
    toast.success(`Bulk enrolled: ${success} success, ${errors.length} errors`);
    if (fileRef.current) fileRef.current.value = '';
    onRefresh();
  };

  const downloadErrors = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csvErrors.join('\n')], { type: 'text/plain' }));
    a.download = 'enrollment_errors.txt'; a.click();
  };

  return (
    <div className="space-y-5">

      {/* ── HOW IT WORKS BANNER ── */}
      <div className="rounded-2xl p-4 border-2 border-indigo-200 bg-indigo-50">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">ℹ️</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-indigo-800 mb-1">How Biometric Attendance Works</p>
            <ol className="text-xs text-indigo-700 space-y-0.5 list-decimal list-inside">
              <li>Enroll student here (PIN = their Admission Number)</li>
              <li>On ZKTeco device: Menu → User Mgmt → New User → PIN = Admission No → Scan finger 3x</li>
              <li>Student places finger on device → device pushes to APSIMS</li>
              <li>APSIMS matches PIN to student → <strong>automatically marks attendance ✅</strong></li>
            </ol>
            <p className="text-[10px] text-indigo-500 mt-1">ADMS Push URL: <strong>{typeof window !== 'undefined' ? window.location.origin : 'https://apsims.vercel.app'}/api/biometric/zkteco</strong> (configure on device)</p>
          </div>
          <button onClick={() => setShowInfoModal(true)} className="flex-shrink-0 text-indigo-600 hover:text-indigo-800">
            <FiInfo size={16} />
          </button>
        </div>
      </div>

      {/* ── STATS ── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-green-700">{enrolled}</p>
          <p className="text-xs text-green-600 mt-1 font-semibold">✅ Enrolled</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-amber-700">{unenrolled}</p>
          <p className="text-xs text-amber-600 mt-1 font-semibold">⚠️ Not Enrolled</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-black text-indigo-700">{pct}%</p>
          <p className="text-xs text-indigo-600 mt-1 font-semibold">📊 Coverage</p>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1">
            <FiSearch size={13} className="absolute left-3 top-3 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students by name or admission no…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
          </div>
          <div className="flex gap-1.5">
            {(['all', 'enrolled', 'not_enrolled'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className="px-3 py-2 rounded-xl text-[11px] font-bold transition-all capitalize"
                style={filterStatus === f ? { background: '#4f46e5', color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {f === 'all' ? 'All' : f === 'enrolled' ? '✅ Enrolled' : '⚠️ Not Yet'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
          {/* Auto-Enroll All */}
          <button onClick={autoEnrollAll} disabled={bulkLoading}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            {bulkLoading ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiZap size={11} />}
            Auto-Enroll All (PIN = Admission No)
          </button>
          {/* CSV Template */}
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100">
            <FiDownload size={11} />Download CSV Template
          </button>
          {/* Bulk Upload */}
          <label className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 cursor-pointer">
            <FiUpload size={11} />Bulk Upload CSV
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleCSV} />
          </label>
          {csvErrors.length > 0 && (
            <button onClick={downloadErrors} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl">
              <FiDownload size={11} />{csvErrors.length} errors
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400 self-center">Showing {filtered.length} of {students.length} students</span>
        </div>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['#', 'Student', 'Admission No', 'Status', 'PIN on Device', 'Method', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${s.biometric_enrolled ? '' : 'bg-amber-50/30'}`}>
                  <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: s.biometric_enrolled ? 'linear-gradient(135deg,#059669,#047857)' : 'linear-gradient(135deg,#94a3b8,#64748b)' }}>
                        {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{s.first_name} {s.last_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono font-bold text-gray-600">{s.admission_number || '—'}</td>
                  <td className="px-4 py-3">
                    {s.biometric_enrolled
                      ? <span className="flex items-center gap-1 text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit">
                          <FiCheckCircle size={9} />Enrolled
                        </span>
                      : <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-bold w-fit animate-pulse">
                          <FiUserX size={9} />Not Enrolled
                        </span>}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-gray-600">{s.biometric_device_user_id || '—'}</td>
                  <td className="px-4 py-3">
                    {s.biometric_enrolled && <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">☝️ Fingerprint</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openEnroll(s)}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition whitespace-nowrap">
                        <FiUserCheck size={10} />{s.biometric_enrolled ? 'Update' : 'Enroll'}
                      </button>
                      {s.biometric_enrolled && (
                        <button onClick={() => handleDeactivate(s)}
                          className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition">
                          <FiX size={10} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16 text-gray-400">
                  <FiUsers size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No students found</p>
                  <p className="text-xs mt-1 text-gray-300">Students load from school_students table</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ENROLL MODAL ── */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Enroll Student</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                </div>
                <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center"><FiX size={14} /></button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-blue-50 rounded-2xl text-xs text-blue-700">
                <p className="font-bold mb-1">📌 Important:</p>
                <p>The <strong>Device User ID / PIN</strong> below must match exactly what you program on the ZKTeco device for this student. We recommend using their Admission Number.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Device User ID / PIN *</label>
                <input value={enrollForm.device_user_id}
                  onChange={e => setEnrollForm(f => ({ ...f, device_user_id: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-mono font-bold tracking-wider focus:border-indigo-400 outline-none"
                  placeholder={`e.g. ${selectedStudent.admission_number || '12345'}`} />
                <p className="text-[10px] text-gray-400 mt-1">Default = Admission Number. Must match exactly what's on the ZKTeco device.</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">Enrollment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {ENROLL_TYPES.map(t => (
                    <button key={t} onClick={() => setEnrollForm(f => ({ ...f, enrollment_type: t }))}
                      className="p-2.5 rounded-xl text-xs font-bold capitalize border-2 transition-all"
                      style={enrollForm.enrollment_type === t
                        ? { borderColor: '#4f46e5', background: '#eef2ff', color: '#4f46e5' }
                        : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                      {t === 'fingerprint' ? '☝️' : t === 'face' ? '😊' : t === 'card' ? '💳' : '🔢'} {t}
                    </button>
                  ))}
                </div>
              </div>
              {devices.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5">Device (optional)</label>
                  <select value={enrollForm.device_id} onChange={e => setEnrollForm(f => ({ ...f, device_id: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:border-indigo-400 outline-none">
                    <option value="">— Select Device —</option>
                    {devices.map((d: any) => <option key={d.id} value={d.id}>{d.device_name} ({d.brand})</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={handleEnroll} disabled={saving}
                className="flex-1 py-3 text-sm font-bold text-white rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Enrolling…' : 'Save Enrollment'}
              </button>
              <button onClick={() => setShowModal(false)} className="px-5 py-3 text-sm text-gray-500 bg-gray-100 rounded-2xl">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HOW IT WORKS DETAILED MODAL ── */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-5 border-b bg-indigo-600 rounded-t-3xl flex items-center justify-between">
              <h3 className="font-black text-white">How Biometric Attendance Works</h3>
              <button onClick={() => setShowInfoModal(false)} className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center text-white"><FiX size={12} /></button>
            </div>
            <div className="p-5 space-y-4">
              {[
                { step: 1, icon: '📋', title: 'Enroll Student Here', body: 'Click "Enroll" next to student. Set PIN = their Admission Number. Or click "Auto-Enroll All" to do everyone at once.' },
                { step: 2, icon: '🖥️', title: 'Configure ZKTeco Device (ADMS)', body: `On device: Menu → Comm → Cloud/ADMS → Enable → Server: ${typeof window !== 'undefined' ? window.location.origin : 'https://apsims.vercel.app'}/api/biometric/zkteco → Port: 443` },
                { step: 3, icon: '☝️', title: 'Register Fingerprint on Physical Device', body: 'On ZKTeco device: Menu → User Management → New User → User ID = Admission Number → Enroll Fingerprint (place finger 3 times)' },
                { step: 4, icon: '🎯', title: 'Student Scans Finger', body: 'Student places finger on device. Device matches fingerprint to User ID. Sends data to APSIMS within 30 seconds.' },
                { step: 5, icon: '✅', title: 'Attendance Auto-Marked', body: 'APSIMS receives the PIN, looks up student by admission number, marks "Present" in school_attendance table for the correct session (Morning/Afternoon/Evening based on time).' },
                { step: 6, icon: '📊', title: 'See in Attendance Page', body: 'Go to Student Attendance → Select Class → You will see the student already marked Present with a note "Biometric (Fingerprint)"' },
              ].map(s => (
                <div key={s.step} className="flex gap-3 p-3 bg-gray-50 rounded-2xl">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">{s.step}</div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{s.icon} {s.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{s.body}</p>
                  </div>
                </div>
              ))}
              <div className="p-3 bg-green-50 rounded-2xl text-xs text-green-700 font-medium">
                ✅ Once configured, attendance is <strong>fully automatic</strong> — no teacher action needed!
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiSave, FiDownload, FiCalendar, FiCheckCircle, FiXCircle, FiClock,
  FiUsers, FiActivity, FiSearch, FiZap, FiBarChart2, FiChevronLeft,
  FiChevronRight, FiAlertTriangle, FiPrinter, FiRefreshCw, FiLock,
  FiUnlock, FiShield, FiMessageSquare, FiEye, FiX, FiFilter,
  FiTrendingUp, FiInfo, FiCheck,
} from 'react-icons/fi';

// ─── Types ─────────────────────────────────────────────────────────────────────
type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Absent with Permission' | 'Excused';
type SessionType = 'Morning' | 'Afternoon' | 'Evening';
type PageTab = 'register' | 'reports' | 'history';
type InputMode = 'manual' | 'biometric';

const STATUS_CFG: Record<AttendanceStatus, { color: string; bg: string; border: string; label: string; short: string; icon: any }> = {
  'Present':              { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', label: 'Present',              short: 'P',  icon: FiCheckCircle },
  'Absent':               { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'Absent',               short: 'A',  icon: FiXCircle },
  'Late':                 { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Late',                 short: 'L',  icon: FiClock },
  'Absent with Permission': { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', label: 'Abs w/ Perm',       short: 'AP', icon: FiShield },
  'Excused':              { color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', label: 'Excused',              short: 'EX', icon: FiCalendar },
};

const ALL_STATUSES = Object.keys(STATUS_CFG) as AttendanceStatus[];
const SESSIONS: SessionType[] = ['Morning', 'Afternoon', 'Evening'];

function fmtDate(d: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' });
}
function todayStr() { return new Date().toISOString().split('T')[0]; }
function shiftDay(dateStr: string, days: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

// ─── Attendance History Modal ───────────────────────────────────────────────────
function HistoryModal({ student, onClose }: { student: any; onClose: () => void }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('school_attendance')
        .select('*').eq('student_id', student.id)
        .order('attendance_date', { ascending: false }).limit(60);
      setRecords(data || []);
      setLoading(false);
    })();
  }, [student.id]);
  const presentN = records.filter(r => r.status === 'Present').length;
  const absentN  = records.filter(r => r.status === 'Absent').length;
  const rate = records.length > 0 ? Math.round(((presentN + records.filter(r => r.status === 'Late').length) / records.length) * 100) : 0;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="p-5 border-b flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', borderRadius: '24px 24px 0 0' }}>
          <div>
            <h3 className="text-white font-black text-sm">📅 Attendance History</h3>
            <p className="text-indigo-200 text-xs mt-0.5">{student.first_name} {student.last_name} · {student.admission_no || student.admission_number}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white"><FiX size={14} /></button>
        </div>
        <div className="p-4 border-b grid grid-cols-3 gap-3 flex-shrink-0">
          {[{ l: 'Present', v: presentN, c: '#059669' }, { l: 'Absent', v: absentN, c: '#dc2626' }, { l: 'Rate', v: `${rate}%`, c: rate >= 80 ? '#059669' : '#dc2626' }].map(k => (
            <div key={k.l} className="text-center rounded-xl p-3" style={{ background: '#f8fafc' }}>
              <p className="text-xl font-black" style={{ color: k.c }}>{k.v}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase">{k.l}</p>
            </div>
          ))}
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-1">
          {loading ? <p className="text-center text-gray-400 py-8">Loading…</p> : records.length === 0 ? <p className="text-center text-gray-400 py-8">No history found</p> :
            records.map(r => {
              const cfg = STATUS_CFG[r.status as AttendanceStatus] || STATUS_CFG.Absent;
              return (
                <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: cfg.bg }}>
                  <span className="text-xs font-bold text-gray-700">{fmtDate(r.attendance_date)}</span>
                  <span className="text-xs font-black px-2 py-0.5 rounded-full border" style={{ color: cfg.color, borderColor: cfg.border }}>{r.status}</span>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  // Data
  const [forms, setForms]           = useState<any[]>([]);
  const [streams, setStreams]       = useState<any[]>([]);
  const [students, setStudents]     = useState<any[]>([]);
  const [leaveOuts, setLeaveOuts]   = useState<any[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);

  // Selections
  const [selForm, setSelForm]       = useState('');
  const [selStream, setSelStream]   = useState('');
  const [selDate, setSelDate]       = useState(todayStr());
  const [session, setSession]       = useState<SessionType>('Morning');
  const [search, setSearch]         = useState('');
  const [mode, setMode]             = useState<InputMode>('manual');
  const [pageTab, setPageTab]       = useState<PageTab>('register');
  const [locked, setLocked]         = useState(false);

  // Attendance maps
  const [attendance, setAttendance]         = useState<Record<string, AttendanceStatus>>({});
  const [savedAttendance, setSavedAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [remarks, setRemarks]               = useState<Record<string, string>>({});
  const [lateTimes, setLateTimes]           = useState<Record<string, string>>({});
  const [lateTimeOpen, setLateTimeOpen]     = useState<string | null>(null);

  // Biometric scanner ref — use ref for buffer (NOT state) so keydown handler stays stable
  const bioInput = useRef<HTMLInputElement>(null);
  const [bioScanned, setBioScanned]   = useState<Set<string>>(new Set());
  const bioScanBuffer = useRef('');   // ← ref avoids handler teardown on every keystroke
  const bioTimer = useRef<any>(null);

  // Reports
  const [reportData, setReportData]         = useState<any[]>([]);
  const [reportLoading, setReportLoading]   = useState(false);
  const [historyStudent, setHistoryStudent] = useState<any | null>(null);

  // Fetch master data
  const fetchData = useCallback(async () => {
    setLoading(true);
    const [f, st, s, lo] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
      supabase.from('school_leave_outs').select('*').in('status', ['Out']),
    ]);
    setForms(f.data || []);
    setStreams(st.data || []);
    setStudents(s.data || []);
    setLeaveOuts(lo.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Leave out map: studentId → leave record ──────────────────────────────────
  const leaveOutMap = useMemo(() => {
    const map: Record<string, any> = {};
    leaveOuts.forEach(lo => { map[String(lo.student_id)] = lo; });
    return map;
  }, [leaveOuts]);

  // ── Is a student "absent with permission" for a given date? ─────────────────
  const isAbsentWithPerm = useCallback((studentId: number | string, dateStr: string) => {
    const lo = leaveOutMap[String(studentId)];
    if (!lo) return false;
    // Student's leave start date (the day they left)
    const leftDateStr = new Date(lo.time_left).toISOString().split('T')[0];
    // If attendance date is on or after they left, and they're still 'Out' → Absent with Permission
    return dateStr >= leftDateStr;
  }, [leaveOutMap]);

  // ── Filtered class list ──────────────────────────────────────────────────────
  const classStudents = useMemo(() => students
    .filter(s => selForm && String(s.form_id) === selForm)
    .filter(s => !selStream || String(s.stream_id) === selStream)
    .filter(s => !search || `${s.first_name} ${s.last_name} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || ''))
  , [students, selForm, selStream, search]);

  // ── Load attendance when class/date changes ──────────────────────────────────
  useEffect(() => {
    if (!selForm || !selDate) return;
    (async () => {
      const ids = classStudents.map(s => s.id);
      if (ids.length === 0) return;
      const { data } = await supabase.from('school_attendance')
        .select('*').in('student_id', ids).eq('attendance_date', selDate).eq('session', session);
      const map: Record<string, AttendanceStatus> = {};
      const remarksMap: Record<string, string> = {};
      const lateMap: Record<string, string> = {};
      (data || []).forEach((r: any) => {
        map[String(r.student_id)] = r.status;
        if (r.notes) remarksMap[String(r.student_id)] = r.notes;       // DB column = notes
        if (r.late_time) lateMap[String(r.student_id)] = r.late_time;
      });
      // ── AUTO-FILL: Absent with Permission for students on active leave ────────
      classStudents.forEach(s => {
        if (!map[String(s.id)] && isAbsentWithPerm(s.id, selDate)) {
          map[String(s.id)] = 'Absent with Permission';
        }
      });
      setAttendance(map);
      setSavedAttendance(map);
      setRemarks(remarksMap);
      setLateTimes(lateMap);
      setLocked(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selForm, selStream, selDate, session, students, leaveOuts]);

  // ── Biometric Scanner Logic ───────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'biometric') return;
    const handleKey = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      clearTimeout(bioTimer.current);
      if (e.key === 'Enter') {
        const admNo = bioScanBuffer.current.trim();
        bioScanBuffer.current = '';
        if (admNo) {
          const student = classStudents.find(s =>
            (s.admission_no || s.admission_number || '').toLowerCase() === admNo.toLowerCase() ||
            String(s.id) === admNo
          );
          if (student) {
            setAttendance(prev => ({ ...prev, [String(student.id)]: 'Present' }));
            setBioScanned(prev => new Set([...prev, String(student.id)]));
            toast.success(`✅ ${student.first_name} ${student.last_name} — Present`, { duration: 1500 });
          } else {
            toast.error(`❌ Unknown ID: ${admNo}`, { duration: 1500 });
          }
        }
      } else if (e.key.length === 1) {
        bioScanBuffer.current += e.key;
        bioTimer.current = setTimeout(() => { bioScanBuffer.current = ''; }, 3000);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  // Only re-run when mode or classStudents changes — NOT on every keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, classStudents]);

  // ── Status change ────────────────────────────────────────────────────────────
  const setStatus = (studentId: number, status: AttendanceStatus) => {
    if (locked) return;
    setAttendance(prev => ({ ...prev, [String(studentId)]: status }));
    if (status !== 'Late') {
      setLateTimeOpen(null);
    }
  };

  // ── Bulk operations ──────────────────────────────────────────────────────────
  const markAllPresent = () => {
    if (locked) return;
    const map: Record<string, AttendanceStatus> = {};
    classStudents.forEach(s => { map[String(s.id)] = 'Present'; });
    setAttendance(map);
  };
  const markUnmarkedPresent = () => {
    if (locked) return;
    const map = { ...attendance };
    classStudents.forEach(s => { if (!map[String(s.id)]) map[String(s.id)] = 'Present'; });
    setAttendance(map);
  };
  const autoApplyPermissions = () => {
    if (locked) return;
    const map = { ...attendance };
    classStudents.forEach(s => {
      if (isAbsentWithPerm(s.id, selDate)) {
        map[String(s.id)] = 'Absent with Permission';
      }
    });
    setAttendance(map);
    const count = classStudents.filter(s => isAbsentWithPerm(s.id, selDate)).length;
    toast.success(`✅ ${count} student${count !== 1 ? 's' : ''} marked Absent with Permission`);
  };
  const clearAll = () => { if (locked) return; setAttendance({}); };

  // ── SAVE (bulk upsert) ───────────────────────────────────────────────────────
  const handleSaveAll = async () => {
    if (classStudents.length === 0 || locked) return;
    setSaving(true);
    const records = classStudents.map(s => ({
      student_id: s.id,
      attendance_date: selDate,
      session,
      status: attendance[String(s.id)] || 'Present',
      notes: remarks[String(s.id)] || null,       // DB column = notes
      late_time: lateTimes[String(s.id)] || null,
      form_id: s.form_id,
      stream_id: s.stream_id,
    }));
    try {
      // Try bulk upsert first
      const { error } = await (supabase.from('school_attendance') as any)
        .upsert(records, { onConflict: 'student_id,attendance_date,session' });
      if (error) {
        // Fallback: individual upsert
        let saved = 0;
        for (const rec of records) {
          const { data: existing } = await supabase.from('school_attendance')
            .select('id').eq('student_id', rec.student_id).eq('attendance_date', rec.attendance_date)
            .eq('session', rec.session).maybeSingle();
          if (existing) {
            await (supabase.from('school_attendance') as any).update({ status: rec.status, notes: rec.notes, late_time: rec.late_time }).eq('id', (existing as any).id);
          } else {
            await (supabase.from('school_attendance') as any).insert([rec]);
          }
          saved++;
        }
        toast.success(`✅ ${saved} records saved`);
      } else {
        toast.success(`✅ ${records.length} records saved`);
      }
      setSavedAttendance({ ...attendance });
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    }
    setSaving(false);
  };

  // ── Stats ────────────────────────────────────────────────────────────────────
  const presentCount   = classStudents.filter(s => attendance[String(s.id)] === 'Present').length;
  const absentCount    = classStudents.filter(s => attendance[String(s.id)] === 'Absent').length;
  const lateCount      = classStudents.filter(s => attendance[String(s.id)] === 'Late').length;
  const permCount      = classStudents.filter(s => attendance[String(s.id)] === 'Absent with Permission').length;
  const excusedCount   = classStudents.filter(s => attendance[String(s.id)] === 'Excused').length;
  const totalMarked    = classStudents.filter(s => !!attendance[String(s.id)]).length;
  const onLeaveCount   = classStudents.filter(s => !!leaveOutMap[String(s.id)]).length;
  const attendanceRate = classStudents.length > 0 ? Math.round(((presentCount + lateCount) / classStudents.length) * 100) : 0;

  // ── Premium Excel Export ─────────────────────────────────────────────────────
  const exportExcel = () => {
    if (!classStudents.length) return;
    const formName = forms.find(f => String(f.id) === selForm)?.form_name || '';
    const streamName = streams.find(s => String(s.id) === selStream)?.stream_name || '';
    const headers = ['#', 'Adm No', 'Student Name', 'Session', 'Status', 'Late Time', 'Remarks', 'Leave Out', 'Leave Reason', 'Leave Since'];
    const rows = classStudents.map((s, i) => {
      const lo = leaveOutMap[String(s.id)];
      return [
        i + 1,
        s.admission_no || s.admission_number || '',
        `${s.first_name} ${s.last_name}`,
        session,
        attendance[String(s.id)] || 'Not Marked',
        lateTimes[String(s.id)] || '',
        remarks[String(s.id)] || '',
        lo ? 'Yes' : '',
        lo ? lo.reason : '',
        lo ? fmtDate(new Date(lo.time_left).toISOString().split('T')[0]) : '',
      ];
    });
    const summary = [
      [],
      ['SUMMARY'],
      ['Class', `${formName} ${streamName}`],
      ['Date', fmtDate(selDate)],
      ['Session', session],
      ['Total Students', classStudents.length],
      ['Present', presentCount],
      ['Absent', absentCount],
      ['Late', lateCount],
      ['Absent with Permission', permCount],
      ['Excused', excusedCount],
      ['Attendance Rate', `${attendanceRate}%`],
    ];
    const csv = '\uFEFF' + [...[headers, ...rows], ...summary]
      .map(r => Array.isArray(r) ? r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',') : `"${r}"`)
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Attendance_${formName}_${streamName}_${selDate}_${session}.csv`;
    a.click();
    toast.success('✅ Excel export ready!');
  };

  // ── Print Register ───────────────────────────────────────────────────────────
  const printRegister = () => {
    const formName = forms.find(f => String(f.id) === selForm)?.form_name || '—';
    const streamName = streams.find(s => String(s.id) === selStream)?.stream_name || '';
    const w = window.open('', '_blank');
    w?.document.write(`<!DOCTYPE html><html><head><title>Attendance Register</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#1e293b;font-size:12px;}
  .header{text-align:center;margin-bottom:16px;padding-bottom:10px;border-bottom:2px solid #1e293b;}
  .header h1{font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:1px;}
  .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px;padding:8px;background:#f8fafc;border-radius:8px;}
  .meta-item{text-align:center;}
  .meta-item span{display:block;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;}
  .meta-item strong{font-size:13px;color:#1e293b;}
  table{width:100%;border-collapse:collapse;}
  th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:0.5px;}
  td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;}
  tr:nth-child(even){background:#f8fafc;}
  .status-box{display:inline-block;width:50px;text-align:center;padding:2px 4px;border-radius:4px;font-size:9px;font-weight:700;}
  .legend{margin-top:12px;display:flex;gap:12px;flex-wrap:wrap;}
  .leg-item{font-size:9px;display:flex;align-items:center;gap:4px;}
  .sig-section{margin-top:24px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:24px;}
  .sig-line{border-top:1px solid #64748b;margin-top:30px;padding-top:4px;font-size:9px;color:#64748b;}
  @media print{@page{size:A4;margin:10mm;}}
</style></head><body>
<div class="header">
  <h1>DAILY ATTENDANCE REGISTER</h1>
  <p style="font-size:11px;margin-top:2px;color:#475569">${formName} ${streamName} &nbsp;|&nbsp; ${fmtDate(selDate)} &nbsp;|&nbsp; ${session} Session</p>
</div>
<div class="meta">
  <div class="meta-item"><span>Class</span><strong>${formName} ${streamName || 'All'}</strong></div>
  <div class="meta-item"><span>Date</span><strong>${fmtDate(selDate)}</strong></div>
  <div class="meta-item"><span>Session</span><strong>${session}</strong></div>
  <div class="meta-item"><span>Present / Total</span><strong>${presentCount} / ${classStudents.length}</strong></div>
</div>
<table>
  <thead><tr>
    <th width="30">#</th>
    <th width="80">Adm No</th>
    <th>Student Name</th>
    <th width="90">Status</th>
    <th width="60">Late Time</th>
    <th>Remarks</th>
    <th width="70">Sign</th>
  </tr></thead>
  <tbody>
    ${classStudents.map((s, i) => {
      const st = attendance[String(s.id)] || 'Not Marked';
      const cfg = STATUS_CFG[st as AttendanceStatus];
      const lo = leaveOutMap[String(s.id)];
      const color = cfg?.color || '#6b7280';
      const bg = cfg?.bg || '#f9fafb';
      return `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:700;color:#2563eb">${s.admission_no || s.admission_number || '—'}</td>
        <td><strong>${s.first_name} ${s.last_name}</strong>${lo ? ' 🏃' : ''}</td>
        <td><span class="status-box" style="background:${bg};color:${color};border:1px solid ${cfg?.border || '#e5e7eb'}">${st}</span></td>
        <td style="color:#d97706">${lateTimes[String(s.id)] || ''}</td>
        <td style="color:#64748b">${remarks[String(s.id)] || (lo ? `Leave out: ${lo.reason}` : '')}</td>
        <td></td>
      </tr>`;
    }).join('')}
  </tbody>
</table>
<div class="legend">
  ${Object.entries(STATUS_CFG).map(([k, v]) => `<div class="leg-item"><span style="background:${v.bg};color:${v.color};border:1px solid ${v.border};padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700">${v.short}</span> = ${k}</div>`).join('')}
  <div class="leg-item">🏃 = On Leave Out</div>
</div>
<p style="margin-top:8px;font-size:9px;color:#94a3b8">Total: ${classStudents.length} | Present: ${presentCount} | Absent: ${absentCount} | Late: ${lateCount} | Abs w/Perm: ${permCount} | Rate: ${attendanceRate}%</p>
<div class="sig-section">
  <div><div class="sig-line">Class Teacher / Teacher on Duty</div></div>
  <div><div class="sig-line">Deputy Principal</div></div>
  <div><div class="sig-line">Principal</div></div>
</div>
<p style="text-align:center;margin-top:16px;font-size:9px;color:#94a3b8">Printed by APSIMS Attendance System · ${new Date().toLocaleDateString('en-KE')}</p>
<script>window.onload=()=>{window.print();}</script>
</body></html>`);
    w?.document.close();
  };

  // ── Load Reports ─────────────────────────────────────────────────────────────
  const loadReports = useCallback(async () => {
    if (!selForm) return;
    setReportLoading(true);
    const ids = students.filter(s => String(s.form_id) === selForm && (!selStream || String(s.stream_id) === selStream)).map(s => s.id);
    if (!ids.length) { setReportLoading(false); return; }
    // Last 30 days
    const from = new Date(); from.setDate(from.getDate() - 30);
    const { data } = await supabase.from('school_attendance')
      .select('*').in('student_id', ids)
      .gte('attendance_date', from.toISOString().split('T')[0])
      .order('attendance_date');
    setReportData(data || []);
    setReportLoading(false);
  }, [selForm, selStream, students]);

  useEffect(() => { if (pageTab === 'reports') loadReports(); }, [pageTab, loadReports]);

  // ── Report analytics ─────────────────────────────────────────────────────────
  const reportByDate = useMemo(() => {
    const map: Record<string, { present: number; absent: number; late: number; perm: number; total: number }> = {};
    reportData.forEach(r => {
      if (!map[r.attendance_date]) map[r.attendance_date] = { present: 0, absent: 0, late: 0, perm: 0, total: 0 };
      map[r.attendance_date].total++;
      if (r.status === 'Present') map[r.attendance_date].present++;
      else if (r.status === 'Absent') map[r.attendance_date].absent++;
      else if (r.status === 'Late') map[r.attendance_date].late++;
      else if (r.status === 'Absent with Permission') map[r.attendance_date].perm++;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [reportData]);

  const chronicalAbsentees = useMemo(() => {
    const map: Record<string, number> = {};
    reportData.filter(r => r.status === 'Absent').forEach(r => {
      map[String(r.student_id)] = (map[String(r.student_id)] || 0) + 1;
    });
    return Object.entries(map)
      .map(([id, count]) => ({ student: students.find(s => String(s.id) === id), count }))
      .filter(x => x.student && x.count >= 3)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [reportData, students]);

  // ── Display helpers ───────────────────────────────────────────────────────────
  const formName   = forms.find(f => String(f.id) === selForm)?.form_name || '';
  const streamName = streams.find(s => String(s.id) === selStream)?.stream_name || '';
  const isToday    = selDate === todayStr();
  const dayName    = new Date(selDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-600 animate-spin" />
          <FiUsers className="absolute inset-0 m-auto text-indigo-500" size={20} />
        </div>
        <p className="text-sm font-semibold text-gray-500 animate-pulse">Loading Ultra Attendance System…</p>
      </div>
    </div>
  );

  return (
    <>
      {historyStudent && <HistoryModal student={historyStudent} onClose={() => setHistoryStudent(null)} />}

      <div className="space-y-4">

        {/* ════ ULTRA HERO HEADER ════ */}
        <div className="relative overflow-hidden rounded-2xl" style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#3730a3 50%,#4f46e5 100%)' }}>
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)', backgroundSize: '22px 22px' }} />
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full opacity-10" style={{ background: 'radial-gradient(circle,#a5b4fc,transparent)', transform: 'translate(30%,-30%)' }} />
          <div className="relative px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(135deg,#818cf8,#6366f1)' }}>
                  <FiCheckCircle className="text-white" size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-extrabold text-white flex items-center gap-2">
                    📋 Ultra Attendance System
                    <span className="px-2 py-0.5 text-[10px] font-black rounded-full" style={{ background: 'linear-gradient(135deg,#818cf8,#06b6d4)' }}>ULTRA</span>
                    {locked && <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-500">🔒 LOCKED</span>}
                  </h1>
                  <p className="text-indigo-300 text-xs mt-0.5">
                    Manual Register + Biometric · Absent with Permission Auto-Detection · Sessions · Reports · Print · Excel
                    {formName && <span className="ml-2 text-white font-bold">{formName}{streamName ? ` — ${streamName}` : ''} · {dayName}</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Mode Toggle */}
                <div className="flex rounded-xl overflow-hidden border border-white/20">
                  {(['manual', 'biometric'] as InputMode[]).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className="px-3 py-1.5 text-xs font-bold transition-all"
                      style={{ background: mode === m ? 'rgba(255,255,255,0.25)' : 'transparent', color: '#fff' }}>
                      {m === 'manual' ? '📝 Manual' : '🔬 Biometric'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setLocked(l => !l)} className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition" style={{ background: locked ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.15)', color: '#fff' }}>
                  {locked ? <FiLock size={12} /> : <FiUnlock size={12} />} {locked ? 'Unlock' : 'Lock'}
                </button>
                <button onClick={exportExcel} disabled={!classStudents.length} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500/80 hover:bg-emerald-500 flex items-center gap-1.5 transition disabled:opacity-40"><FiDownload size={12} /> Excel</button>
                <button onClick={printRegister} disabled={!classStudents.length} className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-white/15 hover:bg-white/25 flex items-center gap-1.5 transition disabled:opacity-40"><FiPrinter size={12} /> Print</button>
                <button onClick={handleSaveAll} disabled={saving || !classStudents.length || locked}
                  className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-lg transition active:scale-95 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#10b981,#059669)', boxShadow: '0 4px 14px rgba(16,185,129,0.4)' }}>
                  {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><FiSave size={13} />Save Register</>}
                </button>
                <button onClick={fetchData} className="p-2 rounded-xl text-white hover:bg-white/10 transition"><FiRefreshCw size={14} /></button>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4 pt-4 border-t border-white/10">
              {[
                { l: 'Total', v: classStudents.length, emoji: '👥' },
                { l: 'Present', v: presentCount, emoji: '✅' },
                { l: 'Absent', v: absentCount, emoji: '❌', pulse: absentCount > 0 },
                { l: 'Late', v: lateCount, emoji: '⏰' },
                { l: 'Abs w/Perm', v: permCount, emoji: '🛡️' },
                { l: 'Excused', v: excusedCount, emoji: '📅' },
                { l: 'On Leave', v: onLeaveCount, emoji: '🏃', pulse: onLeaveCount > 0 },
                { l: 'Rate', v: `${attendanceRate}%`, emoji: attendanceRate >= 80 ? '🟢' : '🔴' },
              ].map((c, i) => (
                <div key={i} className={`rounded-xl p-2.5 ${c.pulse ? 'animate-pulse' : ''}`}
                  style={{ background: 'rgba(255,255,255,0.09)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.13)' }}>
                  <div className="text-sm mb-0.5">{c.emoji}</div>
                  <div className="text-lg font-black text-white leading-tight">{c.v}</div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/50">{c.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ════ PAGE TABS ════ */}
        <div className="flex gap-1.5">
          {([['register', '📋 Mark Register'], ['reports', '📊 Reports'], ['history', '📅 Attendance History']] as const).map(([t, l]) => (
            <button key={t} onClick={() => setPageTab(t)}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all"
              style={pageTab === t
                ? { background: 'linear-gradient(135deg,#4338ca,#6366f1)', color: '#fff', boxShadow: '0 8px 25px -5px rgba(99,102,241,0.4)' }
                : { background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb' }}>
              {l}
            </button>
          ))}
        </div>

        {/* ════ MARK REGISTER TAB ════ */}
        {pageTab === 'register' && <>
          {/* Filters */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Form */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Form / Class</label>
                <select value={selForm} onChange={e => { setSelForm(e.target.value); setSelStream(''); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-200 outline-none">
                  <option value="">— Select Form —</option>
                  {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
                </select>
              </div>
              {/* Stream */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Stream</label>
                <select value={selStream} onChange={e => setSelStream(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-200 outline-none">
                  <option value="">All Streams</option>
                  {streams.filter(s => !selForm || String(s.form_id) === selForm).map(s => <option key={s.id} value={String(s.id)}>{s.stream_name}</option>)}
                </select>
              </div>
              {/* Session */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Session</label>
                <select value={session} onChange={e => setSession(e.target.value as SessionType)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-200 outline-none">
                  {SESSIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              {/* Date */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Date</label>
                <div className="flex items-center gap-1">
                  <button onClick={() => setSelDate(shiftDay(selDate, -1))} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50"><FiChevronLeft size={13} /></button>
                  <input type="date" value={selDate} onChange={e => setSelDate(e.target.value)}
                    className="flex-1 px-2 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-indigo-200 outline-none" />
                  <button onClick={() => setSelDate(shiftDay(selDate, 1))} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50"><FiChevronRight size={13} /></button>
                </div>
              </div>
              {/* Search */}
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Search Student</label>
                <div className="relative">
                  <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or admission number…"
                    className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Biometric mode banner */}
          {mode === 'biometric' && selForm && (
            <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-300 bg-blue-50">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 text-xl">🔬</div>
              <div className="flex-1">
                <p className="font-black text-blue-900 text-sm">Biometric Scanner Mode Active</p>
                <p className="text-xs text-blue-700 mt-0.5">Scan student ID card / fingerprint device. System auto-marks students as Present. Students with leave out are pre-marked as <strong>Absent with Permission</strong>.</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-blue-600 font-bold">{bioScanned.size} scanned</span>
                  <span className="text-xs text-blue-400">·</span>
                  <span className="text-xs text-blue-600">{classStudents.length - bioScanned.size} remaining</span>
                  {bioScanned.size > 0 && <button onClick={() => setBioScanned(new Set())} className="ml-2 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-lg">Reset</button>}
                </div>
              </div>
              <div className="text-5xl font-black text-blue-200">{bioScanned.size}</div>
            </div>
          )}

          {/* Auto-permission alert */}
          {selForm && onLeaveCount > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-2xl border-2 border-purple-200 bg-purple-50">
              <FiShield className="text-purple-500 flex-shrink-0" size={20} />
              <div className="flex-1">
                <p className="font-bold text-purple-900 text-sm">🛡️ {onLeaveCount} student{onLeaveCount > 1 ? 's' : ''} on active Leave Out today</p>
                <p className="text-xs text-purple-700 mt-0.5">These students are automatically pre-filled as <strong>"Absent with Permission"</strong>. You can change individual statuses if needed.</p>
              </div>
              <button onClick={autoApplyPermissions} className="px-3 py-1.5 text-xs font-bold text-white rounded-xl flex-shrink-0 flex items-center gap-1" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                <FiZap size={11} /> Re-apply
              </button>
            </div>
          )}

          {!selForm ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center"><FiCheckCircle size={28} className="text-indigo-300" /></div>
              <p className="text-sm font-semibold text-gray-500">Select a Form to mark attendance</p>
              <p className="text-xs text-gray-400 mt-1">Choose a class from the filter above to get started</p>
            </div>
          ) : classStudents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center"><FiUsers size={28} className="text-gray-300" /></div>
              <p className="text-sm font-semibold text-gray-500">No students found in this class</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Bulk actions bar */}
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-600">{totalMarked} / {classStudents.length} marked</span>
                    {totalMarked === classStudents.length && <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1"><FiCheck size={10} /> Complete</span>}
                    {totalMarked > 0 && totalMarked < classStudents.length && <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{classStudents.length - totalMarked} unmarked</span>}
                    {isToday && <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">📅 Today</span>}
                    {locked && <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1"><FiLock size={9} /> Locked</span>}
                  </div>
                  {/* Progress bar */}
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                      {presentCount > 0 && <div className="h-full bg-green-500" style={{ width: `${(presentCount / classStudents.length) * 100}%` }} />}
                      {lateCount > 0 && <div className="h-full bg-amber-400" style={{ width: `${(lateCount / classStudents.length) * 100}%` }} />}
                      {permCount > 0 && <div className="h-full bg-purple-400" style={{ width: `${(permCount / classStudents.length) * 100}%` }} />}
                      {excusedCount > 0 && <div className="h-full bg-cyan-400" style={{ width: `${(excusedCount / classStudents.length) * 100}%` }} />}
                      {absentCount > 0 && <div className="h-full bg-red-400" style={{ width: `${(absentCount / classStudents.length) * 100}%` }} />}
                    </div>
                    <span className="text-xs font-bold" style={{ color: attendanceRate >= 80 ? '#059669' : '#dc2626' }}>{attendanceRate}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button disabled={locked} onClick={markAllPresent} className="px-3 py-1.5 text-xs font-bold text-white rounded-lg flex items-center gap-1 disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}><FiZap size={11} /> All Present</button>
                  <button disabled={locked} onClick={markUnmarkedPresent} className="px-3 py-1.5 text-xs font-bold text-green-700 bg-green-50 rounded-lg flex items-center gap-1 hover:bg-green-100 disabled:opacity-40"><FiCheckCircle size={11} /> Unmarked → Present</button>
                  <button disabled={locked} onClick={autoApplyPermissions} className="px-3 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 rounded-lg flex items-center gap-1 hover:bg-purple-100 disabled:opacity-40"><FiShield size={11} /> Auto-Apply Permissions</button>
                  <button disabled={locked} onClick={clearAll} className="px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-lg flex items-center gap-1 hover:bg-gray-200 disabled:opacity-40"><FiFilter size={11} /> Clear All</button>
                </div>
              </div>

              {/* Student Table */}
              <div className="overflow-x-auto" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-200 sticky top-0 z-10">
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">#</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider w-24">Adm No</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student Name</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-orange-500 uppercase tracking-wider w-28">Leave Out</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider">Attendance Status</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-28">Remarks</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-20">History</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((student, i) => {
                      const status = attendance[String(student.id)];
                      const isSaved = savedAttendance[String(student.id)] === status;
                      const leaveOut = leaveOutMap[String(student.id)];
                      const isOnLeave = !!leaveOut;
                      const autoAbsWithPerm = isAbsentWithPerm(student.id, selDate);
                      const isAbsent = status === 'Absent';
                      const isBioScanned = bioScanned.has(String(student.id));
                      let rowBg = '';
                      if (status === 'Present') rowBg = isBioScanned ? 'bg-green-50/40' : '';
                      else if (status === 'Absent') rowBg = 'bg-red-50/30';
                      else if (status === 'Absent with Permission') rowBg = 'bg-purple-50/30';
                      else if (isOnLeave) rowBg = 'bg-orange-50/30';
                      else if (!isSaved && status) rowBg = 'bg-amber-50/20';
                      return (
                        <tr key={student.id} className={`border-b border-gray-100 hover:bg-indigo-50/20 transition-all ${rowBg}`}>
                          {/* # */}
                          <td className="px-3 py-2.5 text-xs text-gray-400">{i + 1}</td>
                          {/* Adm No */}
                          <td className="px-3 py-2.5">
                            <span className="text-xs font-black text-blue-600">{student.admission_no || student.admission_number || '—'}</span>
                            {isBioScanned && <span className="ml-1 text-[9px] font-bold text-green-600 bg-green-50 px-1 rounded">BIO</span>}
                          </td>
                          {/* Name */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-black"
                                style={{ background: isAbsent ? 'linear-gradient(135deg,#dc2626,#ef4444)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                                {student.first_name?.[0]}{student.last_name?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-800">{student.first_name} {student.last_name}</p>
                                {isOnLeave && <p className="text-[10px] text-orange-500 font-bold">🏃 On Leave Out</p>}
                              </div>
                              {!isSaved && status && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved" />}
                            </div>
                          </td>
                          {/* Leave Out info */}
                          <td className="px-3 py-2.5">
                            {isOnLeave ? (
                              <div className="text-center">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200">🏃 Out</span>
                                <p className="text-[9px] text-orange-600 mt-0.5 font-medium">{leaveOut.reason}</p>
                                <p className="text-[9px] text-gray-400">{fmtDate(new Date(leaveOut.time_left).toISOString().split('T')[0])}</p>
                                {autoAbsWithPerm && <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1 rounded">Auto Perm ✓</span>}
                              </div>
                            ) : <div className="text-center text-gray-200 text-xs">—</div>}
                          </td>
                          {/* Status buttons */}
                          <td className="px-2 py-2">
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                              {ALL_STATUSES.map(s => {
                                const active = status === s;
                                const cfg = STATUS_CFG[s];
                                const isAutoMarked = s === 'Absent with Permission' && autoAbsWithPerm;
                                return (
                                  <button key={s} onClick={() => setStatus(student.id, s)} disabled={locked}
                                    className="px-2 py-1 text-[10px] font-bold rounded-lg transition-all duration-150 flex items-center gap-0.5 disabled:cursor-not-allowed"
                                    style={{
                                      background: active ? cfg.bg : 'transparent',
                                      color: active ? cfg.color : '#9ca3af',
                                      border: active ? `2px solid ${cfg.color}40` : '2px solid transparent',
                                      transform: active ? 'scale(1.05)' : 'scale(1)',
                                      boxShadow: active ? `0 2px 8px ${cfg.color}20` : 'none',
                                      outline: isAutoMarked ? `2px dashed ${cfg.color}` : 'none',
                                      outlineOffset: isAutoMarked ? '2px' : '0',
                                    }}
                                    title={isAutoMarked ? 'Auto-filled from Leave Out' : s}>
                                    {cfg.short}
                                    {isAutoMarked && !active && <span style={{ fontSize: 8 }}>🛡️</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {/* Late time input */}
                            {status === 'Late' && (
                              <div className="mt-1 flex items-center justify-center gap-1">
                                <input type="time" value={lateTimes[String(student.id)] || ''} disabled={locked}
                                  onChange={e => setLateTimes(prev => ({ ...prev, [String(student.id)]: e.target.value }))}
                                  className="text-[10px] border border-amber-300 rounded-lg px-1.5 py-0.5 bg-amber-50 focus:outline-none w-24" />
                              </div>
                            )}
                          </td>
                          {/* Remarks */}
                          <td className="px-2 py-2">
                            <input type="text" disabled={locked} value={remarks[String(student.id)] || ''}
                              onChange={e => setRemarks(prev => ({ ...prev, [String(student.id)]: e.target.value }))}
                              placeholder="Note…" className="w-full text-[10px] border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-gray-50 disabled:bg-transparent disabled:border-transparent" />
                          </td>
                          {/* History */}
                          <td className="px-2 py-2 text-center">
                            <button onClick={() => setHistoryStudent(student)} className="p-1.5 rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 transition" title="View history">
                              <FiEye size={12} className="text-gray-400" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {Object.entries(STATUS_CFG).map(([key, cfg]) => {
                    const count = key === 'Present' ? presentCount : key === 'Absent' ? absentCount : key === 'Late' ? lateCount : key === 'Absent with Permission' ? permCount : excusedCount;
                    return (
                      <span key={key} className="flex items-center gap-1 text-xs font-semibold" style={{ color: cfg.color }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />{cfg.short}: {count}
                      </span>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black" style={{ color: attendanceRate >= 80 ? '#059669' : '#dc2626' }}>
                    <FiActivity size={11} className="inline mr-1" />{attendanceRate}% rate
                  </span>
                  <button onClick={handleSaveAll} disabled={saving || locked}
                    className="px-3 py-1.5 text-xs font-bold text-white rounded-xl flex items-center gap-1 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                    <FiSave size={11} />{saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>}

        {/* ════ REPORTS TAB ════ */}
        {pageTab === 'reports' && (
          <div className="space-y-5">
            {!selForm ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <p className="text-gray-400 font-semibold">Select a Form above to view reports</p>
              </div>
            ) : reportLoading ? (
              <div className="bg-white rounded-2xl border p-12 text-center">
                <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400">Loading reports…</p>
              </div>
            ) : (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { l: 'Total Records', v: reportData.length, c: '#4338ca', emoji: '📋' },
                    { l: 'Present Days', v: reportData.filter(r => r.status === 'Present').length, c: '#059669', emoji: '✅' },
                    { l: 'Absent Days', v: reportData.filter(r => r.status === 'Absent').length, c: '#dc2626', emoji: '❌' },
                    { l: 'Abs w/ Perm', v: reportData.filter(r => r.status === 'Absent with Permission').length, c: '#7c3aed', emoji: '🛡️' },
                  ].map((k, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <div className="text-2xl mb-2">{k.emoji}</div>
                      <div className="text-2xl font-black" style={{ color: k.c }}>{k.v}</div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mt-1">{k.l}</div>
                    </div>
                  ))}
                </div>

                {/* Daily Trend (Last 30 Days) */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-2">
                    <FiBarChart2 size={14} className="text-indigo-500" />
                    <h3 className="text-sm font-bold text-gray-700">Daily Attendance Trend — Last 30 Days</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {['Date', 'Present', 'Absent', 'Late', 'Abs w/Perm', 'Total', 'Rate'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reportByDate.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-8 text-gray-400">No data for selected class</td></tr>
                        ) : reportByDate.slice(-15).reverse().map(([date, d]) => {
                          const rate = d.total > 0 ? Math.round(((d.present + d.late) / d.total) * 100) : 0;
                          return (
                            <tr key={date} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-2.5 text-sm font-bold text-gray-700">{fmtDate(date)}</td>
                              <td className="px-4 py-2.5 text-sm font-bold text-green-600">{d.present}</td>
                              <td className="px-4 py-2.5 text-sm font-bold text-red-500">{d.absent}</td>
                              <td className="px-4 py-2.5 text-sm font-bold text-amber-500">{d.late}</td>
                              <td className="px-4 py-2.5 text-sm font-bold text-purple-600">{d.perm}</td>
                              <td className="px-4 py-2.5 text-sm text-gray-600">{d.total}</td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div style={{ width: `${rate}%`, height: '100%', background: rate >= 80 ? '#10b981' : '#ef4444', borderRadius: 20 }} />
                                  </div>
                                  <span className="text-xs font-bold" style={{ color: rate >= 80 ? '#059669' : '#dc2626' }}>{rate}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Chronic Absentees */}
                {chronicalAbsentees.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b bg-red-50 flex items-center gap-2">
                      <FiAlertTriangle size={14} className="text-red-500" />
                      <h3 className="text-sm font-bold text-red-700">⚠️ Chronic Absentees (3+ days absent in 30 days)</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="bg-gray-50 border-b">
                          {['#', 'Student', 'Adm No', 'Absent Days', 'Action'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase text-left">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {chronicalAbsentees.map((row, i) => (
                            <tr key={i} className="border-t border-gray-100 hover:bg-red-50/30">
                              <td className="px-4 py-3"><span className="w-6 h-6 rounded-full bg-red-100 text-red-600 text-xs font-black flex items-center justify-center">{i + 1}</span></td>
                              <td className="px-4 py-3 text-sm font-bold text-gray-800">{row.student?.first_name} {row.student?.last_name}</td>
                              <td className="px-4 py-3 text-xs text-blue-600 font-mono">{row.student?.admission_no || row.student?.admission_number || '—'}</td>
                              <td className="px-4 py-3"><span className="px-2 py-1 rounded-full text-xs font-black bg-red-100 text-red-700">{row.count} days</span></td>
                              <td className="px-4 py-3"><button onClick={() => setHistoryStudent(row.student)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"><FiEye size={11} />View History</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ════ HISTORY TAB ════ */}
        {pageTab === 'history' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiCalendar size={14} className="text-indigo-500" /> Click a student to view their full attendance history</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {classStudents.map(s => {
                  const lo = leaveOutMap[String(s.id)];
                  return (
                    <button key={s.id} onClick={() => setHistoryStudent(s)}
                      className="p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-black" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                          {s.first_name?.[0]}{s.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-800">{s.first_name} {s.last_name}</p>
                          <p className="text-[10px] text-gray-400">{s.admission_no || s.admission_number}</p>
                        </div>
                      </div>
                      {lo && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">🏃 On Leave</span>}
                    </button>
                  );
                })}
                {!selForm && <div className="col-span-full text-center text-gray-400 text-sm py-8">Select a Form above to see students</div>}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiSearch, FiPlus, FiList, FiBarChart2, FiDownload, FiUser, FiX,
  FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiShield, FiEdit2,
  FiTrash2, FiPrinter, FiClock, FiChevronDown, FiFileText
} from 'react-icons/fi';

type DTab = 'record' | 'history' | 'reports' | 'analytics';

const OFFENCE_CATEGORIES = [
  'Absenteeism / Lateness',
  'Insubordination / Disrespect',
  'Gross Misconduct',
  'Sexual Harassment',
  'Financial Misappropriation / Fraud',
  'Negligence of Duty',
  'Drug / Alcohol Abuse',
  'Corporal Punishment (Illegal)',
  'Examination Irregularity',
  'Bullying / Victimization of Students',
  'False Academic Records',
  'Unlawful Strike Action',
  'Misuse of School Property',
  'Discrimination / Hate Speech',
  'Criminal Conduct',
  'Other',
];

const SEVERITIES = ['Minor', 'Moderate', 'Major', 'Critical'];

const SEV_CFG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  Minor:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', label: 'MINOR' },
  Moderate: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: 'MODERATE' },
  Major:    { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', label: 'MAJOR' },
  Critical: { bg: '#fef2f2', color: '#991b1b', border: '#fca5a5', label: 'CRITICAL' },
};

const ACTIONS = [
  'Verbal Warning',
  'Written Warning / Show Cause Letter',
  'Counselling & Guidance',
  'Caution Letter',
  'Reprimand Letter',
  'Interdiction (Suspension from Duties)',
  'Surcharge (Financial Penalty)',
  'Demotion',
  'Dismissal',
  'TSC Deregistration Referral',
  'Criminal Prosecution Referral',
];

const STATUSES = ['Open', 'Under Investigation', 'Hearing Scheduled', 'Resolved', 'Appealed', 'Closed'];

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  Open:                 { bg: '#dbeafe', color: '#1e40af' },
  'Under Investigation':{ bg: '#fffbeb', color: '#b45309' },
  'Hearing Scheduled':  { bg: '#f3e8ff', color: '#7c3aed' },
  Resolved:             { bg: '#dcfce7', color: '#166534' },
  Appealed:             { bg: '#fff7ed', color: '#c2410c' },
  Closed:               { bg: '#f3f4f6', color: '#4b5563' },
};

const TERMS = ['Term 1', 'Term 2', 'Term 3'];
const KES = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;
const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export default function StaffDisciplinePage() {
  const [tab, setTab] = useState<DTab>('record');
  const [staff, setStaff] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Record form
  const [staffSearch, setStaffSearch] = useState('');
  const [selStaff, setSelStaff] = useState<any>(null);
  const [showStaffDrop, setShowStaffDrop] = useState(false);
  const [category, setCategory] = useState(OFFENCE_CATEGORIES[0]);
  const [severity, setSeverity] = useState('Minor');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState(ACTIONS[0]);
  const [actionDetails, setActionDetails] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [hearingDate, setHearingDate] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [tscNotified, setTscNotified] = useState(false);
  const [appealFiled, setAppealFiled] = useState(false);
  const [selTerm, setSelTerm] = useState('Term 1');
  const [editId, setEditId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [editStatus, setEditStatus] = useState('');

  // History filters
  const [hSearch, setHSearch] = useState('');
  const [hStatus, setHStatus] = useState('');
  const [hCategory, setHCategory] = useState('');
  const [hSeverity, setHSeverity] = useState('');
  const [hFrom, setHFrom] = useState('');
  const [hTo, setHTo] = useState('');

  const currentYear = new Date().getFullYear();

  // ── FETCH ──────────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Fetch staff always first — independently
    const sR = await supabase.from('school_teachers').select('*').order('first_name');
    setStaff(sR.data || []);
    // Fetch discipline records (new table — graceful fallback)
    const dR = await supabase
      .from('school_staff_discipline_cases')
      .select('*, school_teachers(first_name, last_name, tsc_number, role, email)')
      .order('created_at', { ascending: false })
      .limit(500);
    if (!dR.error) setRecords(dR.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── STAFF SEARCH ───────────────────────────────────────────────────────────────
  const filteredStaff = staffSearch.length >= 2
    ? staff.filter(s => `${s.first_name} ${s.last_name} ${s.tsc_number || ''} ${s.email || ''}`.toLowerCase().includes(staffSearch.toLowerCase())).slice(0, 8)
    : [];

  // ── SAVE RECORD ────────────────────────────────────────────────────────────────
  const handleRecord = async () => {
    if (!selStaff) { toast.error('Select a staff member'); return; }
    if (!description.trim()) { toast.error('Describe the incident'); return; }
    setSaving(true);
    const payload = {
      staff_id: selStaff.id,
      incident_date: incidentDate,
      offence_type: category,
      severity,
      description,
      action_taken: actionTaken,
      action_details: actionDetails || null,
      hearing_date: hearingDate || null,
      witnesses: witnesses || null,
      tsc_notified: tscNotified,
      appeal_filed: appealFiled,
      term: selTerm,
      academic_year: currentYear.toString(),
      status: 'Open',
    };
    const { error } = await supabase.from('school_staff_discipline_cases').insert([payload]);
    if (error) { toast.error('Failed: ' + error.message); setSaving(false); return; }
    toast.success('✅ Disciplinary case recorded');
    setSelStaff(null); setStaffSearch(''); setDescription(''); setActionDetails('');
    setWitnesses(''); setHearingDate(''); setTscNotified(false); setAppealFiled(false);
    setSaving(false); fetchAll(); setTab('history');
  };

  // ── UPDATE STATUS ──────────────────────────────────────────────────────────────
  const updateRecord = async () => {
    if (!editRecord) return;
    setSaving(true);
    const { error } = await supabase.from('school_staff_discipline_cases')
      .update({ status: editStatus, action_taken: editRecord.action_taken, hearing_date: editRecord.hearing_date, tsc_notified: editRecord.tsc_notified, appeal_filed: editRecord.appeal_filed })
      .eq('id', editRecord.id);
    if (error) { toast.error(error.message); setSaving(false); return; }
    toast.success('✅ Case updated'); setShowEditModal(false); setSaving(false); fetchAll();
  };

  const deleteRecord = async (id: number) => {
    if (!confirm('Delete this disciplinary case permanently?')) return;
    const { error } = await supabase.from('school_staff_discipline_cases').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted'); fetchAll();
  };

  // ── PRINT OFFICIAL FORM ────────────────────────────────────────────────────────
  const printForm = (rec: any) => {
    const st = rec.school_teachers || staff.find(s => s.id === rec.staff_id);
    const win = window.open('', '_blank');
    win?.document.write(`<!DOCTYPE html><html><head><title>Staff Disciplinary Case — ${st?.first_name} ${st?.last_name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#111;font-size:12px;}
h1{font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:2px;text-align:center;border-bottom:3px double #111;padding-bottom:10px;margin-bottom:6px;}
h2{font-size:11px;font-weight:700;text-align:center;color:#374151;margin-bottom:20px;}
.section{border:1px solid #d1d5db;border-radius:6px;padding:12px;margin:12px 0;}
.section-title{font-size:10px;font-weight:900;text-transform:uppercase;color:#6b7280;letter-spacing:1px;margin-bottom:8px;}
.row{display:grid;grid-template-columns:160px 1fr;gap:4px;margin:4px 0;font-size:11px;}
.label{font-weight:700;color:#374151;}
.value{color:#111;}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:11px;}
th{background:#1e3a8a;color:white;padding:5px 8px;text-align:left;font-size:10px;}
td{border-bottom:1px solid #f3f4f6;padding:4px 8px;}
.sig-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:40px;}
.sig-box{text-align:center;border-top:1px solid #111;padding-top:6px;font-size:10px;}
.badge-critical{background:#fee2e2;color:#991b1b;font-weight:900;padding:2px 8px;border-radius:10px;}
.badge-major{background:#fff7ed;color:#c2410c;font-weight:900;padding:2px 8px;border-radius:10px;}
.badge-moderate{background:#fffbeb;color:#b45309;font-weight:900;padding:2px 8px;border-radius:10px;}
.badge-minor{background:#eff6ff;color:#1d4ed8;font-weight:900;padding:2px 8px;border-radius:10px;}
.footer{text-align:center;font-size:9px;color:#9ca3af;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
</style></head><body>
<h1>🏫 Staff Disciplinary Case Form</h1>
<h2>TSC / Employment Act Compliant · APSIMS School Management System</h2>
<div class="section">
  <div class="section-title">📋 Staff Information</div>
  <div class="row"><span class="label">Full Name:</span><span class="value">${st?.first_name || ''} ${st?.last_name || ''}</span></div>
  <div class="row"><span class="label">TSC Number:</span><span class="value">${st?.tsc_number || '—'}</span></div>
  <div class="row"><span class="label">Role / Position:</span><span class="value">${st?.role || '—'}</span></div>
  <div class="row"><span class="label">Email:</span><span class="value">${st?.email || '—'}</span></div>
</div>
<div class="section">
  <div class="section-title">⚖️ Incident Details</div>
  <div class="row"><span class="label">Case Reference:</span><span class="value">SDC-${rec.id}-${currentYear}</span></div>
  <div class="row"><span class="label">Incident Date:</span><span class="value">${fmtDate(rec.incident_date)}</span></div>
  <div class="row"><span class="label">Term:</span><span class="value">${rec.term || '—'} · ${rec.academic_year || currentYear}</span></div>
  <div class="row"><span class="label">Category:</span><span class="value">${rec.offence_type}</span></div>
  <div class="row"><span class="label">Severity:</span><span class="value"><span class="badge-${rec.severity?.toLowerCase()}">${rec.severity}</span></span></div>
  <div class="row"><span class="label">Description:</span><span class="value">${rec.description}</span></div>
  <div class="row"><span class="label">Witnesses:</span><span class="value">${rec.witnesses || '—'}</span></div>
</div>
<div class="section">
  <div class="section-title">🛡️ Action & Outcome</div>
  <div class="row"><span class="label">Action Taken:</span><span class="value">${rec.action_taken}</span></div>
  <div class="row"><span class="label">Action Details:</span><span class="value">${rec.action_details || '—'}</span></div>
  <div class="row"><span class="label">Hearing Date:</span><span class="value">${fmtDate(rec.hearing_date)}</span></div>
  <div class="row"><span class="label">TSC Notified:</span><span class="value">${rec.tsc_notified ? '✅ Yes' : 'No'}</span></div>
  <div class="row"><span class="label">Appeal Filed:</span><span class="value">${rec.appeal_filed ? '⚠️ Yes' : 'No'}</span></div>
  <div class="row"><span class="label">Current Status:</span><span class="value">${rec.status}</span></div>
</div>
<div class="section">
  <div class="section-title">✍️ Certification</div>
  <p style="font-size:11px;color:#374151;line-height:1.6;margin:6px 0;">
    This disciplinary case has been recorded in accordance with the <strong>Employment Act 2007</strong>, 
    <strong>TSC Code of Regulations 2015</strong>, and the school's internal disciplinary policy. 
    The staff member named above has been duly informed of the charges and their right to respond/appeal.
  </p>
</div>
<div class="sig-grid">
  <div class="sig-box">Reporting Officer<br/><br/>Name: _______________<br/>Sign: _______________<br/>Date: _______________</div>
  <div class="sig-box">Staff Member<br/><br/>Name: _______________<br/>Sign: _______________<br/>Date: _______________</div>
  <div class="sig-box">Principal / Head Teacher<br/><br/>Name: _______________<br/>Sign: _______________<br/>Date: _______________</div>
</div>
<div class="footer">APSIMS School Management System · Ref: SDC-${rec.id}-${currentYear} · Generated: ${new Date().toLocaleString('en-KE')} · STRICTLY CONFIDENTIAL</div>
</body></html>`);
    win?.document.close(); setTimeout(() => win?.print(), 500);
  };

  // ── EXPORT CSV ────────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Ref','Staff Name','TSC No','Role','Date','Category','Severity','Action','Status','TSC Notified','Appeal','Term','Year'];
    const rows = records.map((r, i) => {
      const st = r.school_teachers || staff.find(s => s.id === r.staff_id);
      return [
        `SDC-${r.id}`, `${st?.first_name || ''} ${st?.last_name || ''}`, st?.tsc_number || '',
        st?.role || '', r.incident_date, r.offence_type, r.severity, r.action_taken,
        r.status, r.tsc_notified ? 'Yes' : 'No', r.appeal_filed ? 'Yes' : 'No', r.term || '', r.academic_year || ''
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `Staff_Discipline_Register_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    toast.success('✅ Exported to CSV');
  };

  // ── FILTERED HISTORY ───────────────────────────────────────────────────────────
  const filteredRecords = useMemo(() => records.filter(r => {
    const st = r.school_teachers || staff.find(s => s.id === r.staff_id);
    const name = `${st?.first_name || ''} ${st?.last_name || ''} ${st?.tsc_number || ''}`.toLowerCase();
    if (hSearch && !name.includes(hSearch.toLowerCase())) return false;
    if (hStatus && r.status !== hStatus) return false;
    if (hCategory && r.offence_type !== hCategory) return false;
    if (hSeverity && r.severity !== hSeverity) return false;
    if (hFrom && r.incident_date < hFrom) return false;
    if (hTo && r.incident_date > hTo) return false;
    return true;
  }), [records, hSearch, hStatus, hCategory, hSeverity, hFrom, hTo, staff]);

  // ── ANALYTICS ─────────────────────────────────────────────────────────────────
  const open = records.filter(r => ['Open', 'Under Investigation', 'Hearing Scheduled'].includes(r.status)).length;
  const resolved = records.filter(r => r.status === 'Resolved' || r.status === 'Closed').length;
  const critical = records.filter(r => r.severity === 'Critical' || r.severity === 'Major').length;
  const tscReferred = records.filter(r => r.tsc_notified).length;
  const appeals = records.filter(r => r.appeal_filed).length;

  const byCategoryMap: Record<string, number> = {};
  records.forEach(r => { byCategoryMap[r.offence_type] = (byCategoryMap[r.offence_type] || 0) + 1; });
  const byCategory = Object.entries(byCategoryMap).sort((a, b) => b[1] - a[1]);
  const maxCat = byCategory[0]?.[1] || 1;

  const bySeverityMap: Record<string, number> = {};
  records.forEach(r => { bySeverityMap[r.severity] = (bySeverityMap[r.severity] || 0) + 1; });

  const byStaffMap: Record<number, { name: string; count: number; tsc: string }> = {};
  records.forEach(r => {
    const st = r.school_teachers || staff.find(s => s.id === r.staff_id);
    if (!r.staff_id) return;
    if (!byStaffMap[r.staff_id]) byStaffMap[r.staff_id] = { name: `${st?.first_name || ''} ${st?.last_name || ''}`, count: 0, tsc: st?.tsc_number || '' };
    byStaffMap[r.staff_id].count++;
  });
  const byStaff = Object.entries(byStaffMap).sort((a, b) => b[1].count - a[1].count);

  const TABS_DEF = [
    { id: 'record',    label: '+ Record Case',     icon: FiPlus },
    { id: 'history',   label: '≡ Case Register',   icon: FiList },
    { id: 'reports',   label: 'Reports',            icon: FiFileText },
    { id: 'analytics', label: 'Analytics',          icon: FiBarChart2 },
  ] as const;

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* ── HERO ── */}
      <div className="rounded-2xl overflow-hidden shadow-xl" style={{ background: 'linear-gradient(135deg,#1e1b4b,#4c1d95,#7c3aed)' }}>
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shadow-lg">⚖️</div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Staff Disciplinary Cases</h1>
              <p className="text-purple-200 text-sm mt-0.5">TSC & Employment Act 2007 Compliant · STRICTLY STAFF ONLY</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={fetchAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 border border-white/30 text-white font-bold text-sm hover:bg-white/30 transition">
              <FiClock size={14}/> Refresh
            </button>
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 text-purple-900 font-black text-sm hover:bg-amber-300 transition shadow-lg">
              <FiDownload size={14}/> Export CSV
            </button>
          </div>
        </div>
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 pb-5">
          {[
            { icon: '📋', label: 'Total Cases', val: records.length, c: '#c4b5fd' },
            { icon: '🔴', label: 'Active / Open', val: open, c: open > 0 ? '#fca5a5' : '#86efac' },
            { icon: '✅', label: 'Resolved', val: resolved, c: '#86efac' },
            { icon: '🚨', label: 'Critical / Major', val: critical, c: critical > 0 ? '#fca5a5' : '#e5e7eb' },
            { icon: '🏛️', label: 'TSC Referred', val: tscReferred, c: tscReferred > 0 ? '#fcd34d' : '#e5e7eb' },
          ].map(s => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center border border-white/10">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-lg font-black" style={{ color: s.c }}>{s.val}</div>
              <div className="text-[9px] text-purple-200 font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-2 flex-wrap">
        {TABS_DEF.map(t => (
          <button key={t.id} onClick={() => setTab(t.id as DTab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition ${tab === t.id ? 'bg-purple-700 text-white border-purple-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            <t.icon size={14}/>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><div className="w-12 h-12 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
      ) : tab === 'record' ? (
        /* ── RECORD TAB ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* FORM */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b" style={{ background: 'linear-gradient(135deg,#fef2f2,#fff7ed)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">⚠️</div>
                <div>
                  <h2 className="font-black text-gray-800 text-base">Record Staff Disciplinary Case</h2>
                  <p className="text-xs text-gray-500">Employment Act 2007 · TSC Code of Regulations 2015 — No Corporal Punishment</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-5">
              {/* Staff Search */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">STAFF MEMBER *</label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-3 text-gray-400" size={14}/>
                  <input
                    value={staffSearch}
                    onChange={e => { setStaffSearch(e.target.value); setShowStaffDrop(true); setSelStaff(null); }}
                    onFocus={() => setShowStaffDrop(true)}
                    placeholder="Search by name, TSC number or email…"
                    className="w-full pl-9 pr-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none focus:border-purple-400 bg-gray-50"
                    style={{ borderColor: selStaff ? '#7c3aed' : undefined }}
                  />
                  {selStaff && (
                    <div className="absolute right-3 top-2.5 flex items-center gap-2">
                      <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-1 rounded-lg">{selStaff.first_name} {selStaff.last_name}</span>
                      <button onClick={() => { setSelStaff(null); setStaffSearch(''); }} className="text-gray-400 hover:text-red-500"><FiX size={13}/></button>
                    </div>
                  )}
                  {showStaffDrop && filteredStaff.length > 0 && (
                    <div className="absolute z-20 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl mt-1 overflow-hidden">
                      {filteredStaff.map(s => (
                        <button key={s.id} onClick={() => { setSelStaff(s); setStaffSearch(`${s.first_name} ${s.last_name}`); setShowStaffDrop(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition text-left border-b border-gray-50 last:border-0">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700 text-xs flex-shrink-0">{s.first_name?.[0]}</div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-800 text-sm truncate">{s.first_name} {s.last_name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{s.tsc_number ? `TSC: ${s.tsc_number}` : ''} {s.role || ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selStaff && (
                  <div className="mt-3 p-4 rounded-xl border-2 border-purple-200 bg-purple-50 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center font-black text-purple-800 text-lg flex-shrink-0">{selStaff.first_name?.[0]}</div>
                    <div>
                      <p className="font-black text-gray-800">{selStaff.first_name} {selStaff.last_name}</p>
                      <p className="text-xs text-gray-500">TSC: {selStaff.tsc_number || '—'} · {selStaff.role || '—'}</p>
                      <p className="text-xs text-gray-400">{selStaff.email || '—'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Incident Date & Term */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-600 mb-2">INCIDENT DATE *</label>
                  <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50"/>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-600 mb-2">TERM</label>
                  <select value={selTerm} onChange={e => setSelTerm(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50">
                    {TERMS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">OFFENCE CATEGORY *</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50">
                  {OFFENCE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              {/* Severity buttons */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">SEVERITY *</label>
                <div className="grid grid-cols-4 gap-2">
                  {SEVERITIES.map(s => (
                    <button key={s} onClick={() => setSeverity(s)}
                      className="py-2.5 text-xs font-black rounded-xl border-2 transition-all"
                      style={severity === s ? { background: SEV_CFG[s].color, borderColor: SEV_CFG[s].color, color: 'white' } : { background: SEV_CFG[s].bg, borderColor: SEV_CFG[s].border, color: SEV_CFG[s].color }}>
                      {s === 'Critical' ? '🚨' : s === 'Major' ? '⚠️' : s === 'Moderate' ? '🔶' : '🔵'} {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">INCIDENT DESCRIPTION *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                  placeholder="Describe the incident in full detail, including time, place, and circumstances…"
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50 resize-none"/>
              </div>

              {/* Witnesses */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">WITNESSES</label>
                <input value={witnesses} onChange={e => setWitnesses(e.target.value)}
                  placeholder="Names of witnesses present (comma separated)…"
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50"/>
              </div>

              {/* Action */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">ACTION TAKEN *</label>
                <select value={actionTaken} onChange={e => setActionTaken(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50">
                  {ACTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              {/* Action details */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">ACTION DETAILS / NOTES</label>
                <textarea value={actionDetails} onChange={e => setActionDetails(e.target.value)} rows={2}
                  placeholder="Additional details on the action taken…"
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50 resize-none"/>
              </div>

              {/* Hearing Date */}
              <div>
                <label className="block text-xs font-black text-gray-600 mb-2">HEARING DATE (if applicable)</label>
                <input type="date" value={hearingDate} onChange={e => setHearingDate(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50"/>
              </div>

              {/* Checkboxes */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={tscNotified} onChange={e => setTscNotified(e.target.checked)} className="w-4 h-4 rounded accent-purple-600"/>
                  <span className="text-sm font-bold text-gray-700">TSC / TSC Notified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={appealFiled} onChange={e => setAppealFiled(e.target.checked)} className="w-4 h-4 rounded accent-orange-500"/>
                  <span className="text-sm font-bold text-gray-700">Appeal Filed by Staff</span>
                </label>
              </div>

              {/* Severity warning */}
              {(severity === 'Critical' || severity === 'Major') && (
                <div className="flex items-start gap-3 p-4 rounded-xl border-2 border-red-200 bg-red-50">
                  <FiAlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18}/>
                  <div>
                    <p className="text-sm font-black text-red-700">⚠️ {severity} Offence — TSC Notification Required</p>
                    <p className="text-xs text-red-600 mt-0.5">Per TSC Code of Regulations 2015, major and critical offences must be reported to the TSC and may warrant dismissal or deregistration.</p>
                  </div>
                </div>
              )}

              <button onClick={handleRecord} disabled={saving}
                className="w-full py-3.5 rounded-xl text-white font-black text-sm shadow-lg hover:shadow-xl transition disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed)' }}>
                {saving ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Recording…</span> : '⚖️ Record Disciplinary Case'}
              </button>
            </div>
          </div>

          {/* SIDEBAR — Recent Cases */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-4">🔴 Open Cases ({open})</h3>
              {records.filter(r => ['Open','Under Investigation','Hearing Scheduled'].includes(r.status)).slice(0,6).map(r => {
                const st = r.school_teachers || staff.find(s => s.id === r.staff_id);
                return (
                  <div key={r.id} className="py-3 border-b border-gray-50 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700 text-[10px] flex-shrink-0">{st?.first_name?.[0]}</div>
                        <div className="min-w-0"><p className="text-xs font-black text-gray-800 truncate">{st?.first_name} {st?.last_name}</p><p className="text-[10px] text-gray-400 truncate">{r.offence_type?.slice(0,30)}</p></div>
                      </div>
                      <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: SEV_CFG[r.severity]?.bg, color: SEV_CFG[r.severity]?.color }}>{r.severity}</span>
                    </div>
                    <div className="flex gap-1 mt-2">
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: STATUS_CFG[r.status]?.bg, color: STATUS_CFG[r.status]?.color }}>{r.status}</span>
                      <span className="text-[9px] text-gray-400">{fmtDate(r.incident_date)}</span>
                    </div>
                  </div>
                );
              })}
              {records.filter(r => ['Open','Under Investigation','Hearing Scheduled'].includes(r.status)).length === 0 && (
                <p className="text-center text-gray-400 text-sm py-4">✅ No open cases</p>
              )}
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
              <p className="text-xs font-black text-purple-700 mb-2">📚 Legal Framework</p>
              <ul className="text-[10px] text-purple-600 space-y-1">
                <li>• Employment Act 2007 (Kenya)</li>
                <li>• TSC Code of Regulations 2015</li>
                <li>• Basic Education Act 2013</li>
                <li>• Labour Relations Act 2007</li>
                <li>• Disciplinary action must be fair & proportionate</li>
                <li>• Staff right to respond & appeal is protected</li>
              </ul>
            </div>
          </div>
        </div>

      ) : tab === 'history' ? (
        /* ── CASE REGISTER TAB ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-gray-50/60">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <h3 className="font-black text-gray-800 flex-1">📋 Staff Discipline Register — {records.length} total cases</h3>
            </div>
            {/* Filters */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3">
              <div className="relative col-span-2 sm:col-span-1">
                <FiSearch className="absolute left-2.5 top-2.5 text-gray-400" size={13}/>
                <input value={hSearch} onChange={e => setHSearch(e.target.value)} placeholder="Search staff…"
                  className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-purple-400"/>
              </div>
              <select value={hStatus} onChange={e => setHStatus(e.target.value)} className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-purple-400">
                <option value="">All Status</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <select value={hCategory} onChange={e => setHCategory(e.target.value)} className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-purple-400">
                <option value="">All Categories</option>{OFFENCE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
              <select value={hSeverity} onChange={e => setHSeverity(e.target.value)} className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-purple-400">
                <option value="">All Severity</option>{SEVERITIES.map(s=><option key={s}>{s}</option>)}
              </select>
              <input type="date" value={hFrom} onChange={e => setHFrom(e.target.value)} className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-purple-400"/>
              <input type="date" value={hTo} onChange={e => setHTo(e.target.value)} className="px-2.5 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-purple-400"/>
            </div>
          </div>
          {filteredRecords.length === 0 ? (
            <div className="py-20 text-center"><div className="text-6xl mb-4">⚖️</div><p className="font-black text-gray-600 text-lg">No disciplinary cases found</p><p className="text-gray-400 text-sm mt-1">Use the "Record Case" tab to log a new case</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-gray-50/80">
                  {['Ref','Staff Member','TSC No','Category','Severity','Action Taken','Incident Date','Hearing Date','Status','TSC','Appeal','Actions'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredRecords.map(r => {
                    const st = r.school_teachers || staff.find(s => s.id === r.staff_id);
                    return (
                      <tr key={r.id} className="hover:bg-purple-50/20 transition group">
                        <td className="px-4 py-3 font-mono text-[10px] text-gray-400">SDC-{r.id}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center font-black text-purple-700 text-[10px] flex-shrink-0">{st?.first_name?.[0]}</div>
                            <div><p className="font-black text-gray-800 text-xs whitespace-nowrap">{st?.first_name} {st?.last_name}</p><p className="text-[10px] text-gray-400">{st?.role || '—'}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{st?.tsc_number || '—'}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[130px] truncate">{r.offence_type}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: SEV_CFG[r.severity]?.bg, color: SEV_CFG[r.severity]?.color }}>
                            {r.severity === 'Critical' ? '🚨 ' : r.severity === 'Major' ? '⚠️ ' : ''}{r.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 max-w-[140px] truncate">{r.action_taken}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.incident_date)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.hearing_date)}</td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_CFG[r.status]?.bg || '#f3f4f6', color: STATUS_CFG[r.status]?.color || '#4b5563' }}>{r.status}</span>
                        </td>
                        <td className="px-4 py-3 text-center">{r.tsc_notified ? <span className="text-green-600 font-black text-xs">✅</span> : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3 text-center">{r.appeal_filed ? <span className="text-orange-500 font-black text-xs">⚠️</span> : <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => { setEditRecord({ ...r }); setEditStatus(r.status); setShowEditModal(true); }} title="Update"
                              className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center hover:bg-purple-200"><FiEdit2 size={11}/></button>
                            <button onClick={() => printForm(r)} title="Print"
                              className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center hover:bg-blue-200"><FiPrinter size={11}/></button>
                            <button onClick={() => deleteRecord(r.id)} title="Delete"
                              className="w-7 h-7 rounded-lg bg-red-100 text-red-600 flex items-center justify-center hover:bg-red-200"><FiTrash2 size={11}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      ) : tab === 'analytics' ? (
        /* ── ANALYTICS TAB ── */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Offences by category */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-black text-gray-800 mb-5">📊 Offences by Category</h3>
            <div className="space-y-3">
              {byCategory.map(([cat, count]) => (
                <div key={cat}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-gray-700 truncate max-w-[60%]">{cat}</span>
                    <span className="font-black text-sm text-purple-700">{count}</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-2.5 rounded-full" style={{ width: `${Math.round(count/maxCat*100)}%`, background: 'linear-gradient(to right,#7c3aed,#4c1d95)' }}/>
                  </div>
                </div>
              ))}
              {byCategory.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No data yet</p>}
            </div>
          </div>

          {/* By Severity + Repeat offenders */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-4">🎯 Severity Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                {SEVERITIES.map(s => {
                  const count = bySeverityMap[s] || 0;
                  return (
                    <div key={s} className="rounded-xl p-4 text-center border-2" style={{ background: SEV_CFG[s].bg, borderColor: SEV_CFG[s].border }}>
                      <p className="text-2xl font-black" style={{ color: SEV_CFG[s].color }}>{count}</p>
                      <p className="text-[10px] font-black uppercase" style={{ color: SEV_CFG[s].color }}>{s}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                <div className="text-center bg-green-50 rounded-xl p-2"><p className="text-[10px] text-gray-400 font-bold">RESOLVED</p><p className="font-black text-green-700">{resolved}</p></div>
                <div className="text-center bg-yellow-50 rounded-xl p-2"><p className="text-[10px] text-gray-400 font-bold">TSC NOTIFIED</p><p className="font-black text-yellow-700">{tscReferred}</p></div>
                <div className="text-center bg-orange-50 rounded-xl p-2"><p className="text-[10px] text-gray-400 font-bold">APPEALS</p><p className="font-black text-orange-700">{appeals}</p></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-black text-gray-800 mb-4">🔁 Repeat Offenders (Top Staff)</h3>
              {byStaff.slice(0, 5).map(([id, s], i) => (
                <div key={id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
                    <div><p className="font-black text-gray-800 text-xs">{s.name}</p><p className="text-[10px] text-gray-400">TSC: {s.tsc || '—'}</p></div>
                  </div>
                  <span className="font-black text-purple-700 text-lg">{s.count}</span>
                </div>
              ))}
              {byStaff.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No data yet</p>}
            </div>
          </div>
        </div>

      ) : (
        /* ── REPORTS TAB ── */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-8xl mb-6">🖨️</div>
          <h2 className="text-2xl font-black text-gray-800 mb-3">Print Discipline Register</h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">Generate the full official staff discipline register for audits, TSC inspection, or BoG meetings.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 max-w-lg mx-auto">
            {[['📋',records.length,'Total Cases'],['🔴',open,'Open'],['✅',resolved,'Resolved'],['🏛️',tscReferred,'TSC Referred']].map(([i,v,l])=>(
              <div key={l as string} className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                <div className="text-2xl mb-1">{i}</div>
                <div className="font-black text-purple-800 text-lg">{v}</div>
                <div className="text-[10px] text-gray-500">{l}</div>
              </div>
            ))}
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl text-white font-black text-lg mx-auto shadow-xl hover:shadow-2xl transition"
            style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed)' }}>
            <FiDownload size={22}/> Export Full Register (CSV)
          </button>
          <p className="text-xs text-gray-400 mt-4">Opens in Excel · Print from there for auditor-ready format</p>
        </div>
      )}

      {/* ── UPDATE MODAL ── */}
      {showEditModal && editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed)', borderRadius: '24px 24px 0 0' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center"><FiEdit2 size={18} className="text-white"/></div>
                <div><h3 className="font-black text-white text-sm">Update Disciplinary Case</h3><p className="text-purple-200 text-[10px]">SDC-{editRecord.id}</p></div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white hover:bg-white/30"><FiX size={14}/></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-600 mb-1.5">STATUS</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50">
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 mb-1.5">ACTION TAKEN</label>
                <select value={editRecord.action_taken} onChange={e => setEditRecord({ ...editRecord, action_taken: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50">
                  {ACTIONS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-600 mb-1.5">HEARING DATE</label>
                <input type="date" value={editRecord.hearing_date || ''} onChange={e => setEditRecord({ ...editRecord, hearing_date: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-400 bg-gray-50"/>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editRecord.tsc_notified} onChange={e => setEditRecord({ ...editRecord, tsc_notified: e.target.checked })} className="w-4 h-4 accent-purple-600"/>
                  <span className="text-sm font-bold text-gray-700">TSC Notified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editRecord.appeal_filed} onChange={e => setEditRecord({ ...editRecord, appeal_filed: e.target.checked })} className="w-4 h-4 accent-orange-500"/>
                  <span className="text-sm font-bold text-gray-700">Appeal Filed</span>
                </label>
              </div>
            </div>
            <div className="p-6 border-t flex justify-end gap-3">
              <button onClick={() => setShowEditModal(false)} className="px-5 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={updateRecord} disabled={saving}
                className="px-5 py-2 text-sm font-black text-white rounded-xl disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg,#4c1d95,#7c3aed)' }}>
                {saving ? 'Saving…' : '✅ Update Case'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SQL TABLE SETUP BLOCK ── */}
      <details className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <summary className="cursor-pointer font-black text-gray-700 text-sm">🗄️ SQL: Create school_staff_discipline_cases table (run once in Supabase)</summary>
        <pre className="mt-3 bg-white border border-gray-200 rounded-xl p-4 text-xs overflow-x-auto text-gray-700">{`CREATE TABLE IF NOT EXISTS school_staff_discipline_cases (
  id serial PRIMARY KEY,
  staff_id int REFERENCES school_teachers(id) ON DELETE CASCADE,
  incident_date date NOT NULL,
  offence_type text NOT NULL,
  severity text DEFAULT 'Minor',
  description text,
  action_taken text DEFAULT 'Verbal Warning',
  action_details text,
  witnesses text,
  hearing_date date,
  outcome text,
  tsc_notified boolean DEFAULT false,
  appeal_filed boolean DEFAULT false,
  status text DEFAULT 'Open',
  term text,
  academic_year text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE school_staff_discipline_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "all_staff_discipline" ON school_staff_discipline_cases;
CREATE POLICY "all_staff_discipline" ON school_staff_discipline_cases FOR ALL USING (true) WITH CHECK (true);`}</pre>
      </details>
    </div>
  );
}

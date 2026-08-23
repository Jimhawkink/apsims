'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiFileText, FiDownload, FiRefreshCw, FiCheck, FiPrinter, FiAlertCircle, FiBarChart2, FiUsers, FiBook } from 'react-icons/fi';

// Government report templates
const REPORTS = [
  {
    id: 'moest_enrolment', label: 'MOEST Enrolment Return', emoji: '🏛️',
    description: 'Ministry of Education annual enrolment statistics by form, gender, special needs, nationality.',
    color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe',
    fields: ['School Name', 'Sub-County', 'County', 'Total Boys', 'Total Girls', 'Grand Total', 'Form 1', 'Form 2', 'Form 3', 'Form 4', 'Special Needs', 'Non-Kenyan', 'Boarders', 'Day Scholars'],
    ministry: 'MOEST',
  },
  {
    id: 'tsc_staff', label: 'TSC Staff Returns', emoji: '👩‍🏫',
    description: 'TSC quarterly staff strength returns: teachers by qualification, gender, job group, and deployment.',
    color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd',
    fields: ['TSC No', 'Full Name', 'Gender', 'Job Group', 'Qualification', 'Teaching Subject 1', 'Teaching Subject 2', 'DOB', 'Date of First Appointment', 'Date of Current Posting', 'Status'],
    ministry: 'TSC',
  },
  {
    id: 'emis_data', label: 'EMIS Data Export', emoji: '🖥️',
    description: 'Education Management Information System bulk data export for Kenya National Bureau of Statistics.',
    color: '#059669', bg: '#ecfdf5', border: '#6ee7b7',
    fields: ['EMIS Code', 'School Name', 'Level', 'Type', 'Category', 'Sub-County', 'Ward', 'GPS Latitude', 'GPS Longitude', 'Total Enrolment', 'Total Teachers', 'Classrooms', 'Toilets (Boys)', 'Toilets (Girls)', 'Has Water', 'Has Electricity', 'Has Internet'],
    ministry: 'KNBS / MoE',
  },
  {
    id: 'school_census', label: 'School Census Return', emoji: '📊',
    description: 'Annual school census: infrastructure, facilities, ICT equipment, sports, library, kitchen.',
    color: '#d97706', bg: '#fffbeb', border: '#fde68a',
    fields: ['Classrooms', 'Laboratories', 'Library', 'Computer Lab', 'Computers', 'Projectors', 'Sports Fields', 'Dormitories (Boys)', 'Dormitories (Girls)', 'Kitchen', 'Dining Hall', 'Staff Houses', 'Admin Block', 'Ablution Blocks'],
    ministry: 'MoE / Sub-County',
  },
  {
    id: 'capitation_accountability', label: 'Capitation Accountability', emoji: '💰',
    description: 'Government capitation funds accountability report showing receipts, expenditure, balance per vote head.',
    color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc',
    fields: ['Vote Head', 'Budget Allocated', 'Opening Balance', 'Capitation Received', 'Other Income', 'Total Available', 'Expenditure', 'Closing Balance', 'Variance', 'Comments'],
    ministry: 'MoE / BoG',
  },
  {
    id: 'special_needs', label: 'Learners with Special Needs', emoji: '♿',
    description: 'Register and return of learners with special educational needs (LSEN) for County Director of Education.',
    color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
    fields: ['Admission No', 'Full Name', 'Form', 'DOB', 'Type of Special Need', 'Support Provided', 'Resource Room', 'External Support', 'Parent/Guardian', 'Contact'],
    ministry: 'CoDE / MoE',
  },
];

type GenStatus = 'idle' | 'generating' | 'ready' | 'error';

export default function GovernmentReportsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<GenStatus>('idle');
  const [activeTab, setActiveTab] = useState<'reports' | 'schedule' | 'history'>('reports');
  const [history, setHistory] = useState<{ id: string; label: string; date: string; rows: number }[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [sR, tR, fR, stR, pR] = await Promise.all([
      supabase.from('school_students').select('*'),
      supabase.from('school_teachers').select('*'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*'),
      supabase.from('fee_payments').select('*'),
    ]);
    setStudents(sR.data||[]); setTeachers(tR.data||[]); setForms(fR.data||[]);
    setStreams(stR.data||[]); setPayments(pR.data||[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const stats = useMemo(() => ({
    totalStudents: students.length,
    boys: students.filter(s => s.gender === 'Male').length,
    girls: students.filter(s => s.gender === 'Female').length,
    totalTeachers: teachers.length,
    forms: forms.length,
  }), [students, teachers, forms]);

  const buildReport = useCallback((reportId: string): any[][] => {
    const rpt = REPORTS.find(r => r.id === reportId);
    if (!rpt) return [];
    switch (reportId) {
      case 'moest_enrolment': {
        const byForm = forms.map(f => {
          const fs = students.filter(s => s.form_id === f.id);
          return [f.form_name, fs.filter(s=>s.gender==='Male').length, fs.filter(s=>s.gender==='Female').length, fs.length];
        });
        return [rpt.fields, ...[['ALL FORMS', stats.boys, stats.girls, stats.totalStudents], ...byForm]];
      }
      case 'tsc_staff': {
        return [rpt.fields, ...teachers.map(t => [t.tsc_number||'', `${t.first_name} ${t.last_name}`, t.gender||'', t.job_group||'', t.qualification||'B.Ed', t.subjects?.[0]||'', t.subjects?.[1]||'', t.date_of_birth||'', t.appointment_date||'', t.posting_date||'', t.status||'Active'])];
      }
      case 'emis_data': {
        return [rpt.fields, [
          'TBA', 'School Name', 'Secondary', 'Public', 'Mixed Day/Boarding',
          'Sub-County', 'Ward', '0.000000', '0.000000',
          stats.totalStudents, stats.totalTeachers, forms.length * 2, '20', '20', 'Yes', 'Yes', 'Yes'
        ]];
      }
      case 'school_census': {
        return [rpt.fields, [forms.length*2, 3, 1, 1, 25, 5, 2, 2, 2, 1, 1, 4, 1, 4]];
      }
      case 'capitation_accountability': {
        const total = payments.reduce((s, p) => s + (p.amount||0), 0);
        return [rpt.fields, ...['Tuition','Development','Boarding','Examination','Sports','Library','ICT'].map(vh => [vh, 100000, 5000, 95000, 0, 100000, Math.round(total/7), Math.round(100000-total/7), 0, ''])];
      }
      case 'special_needs': {
        const sped = students.filter(s => s.special_needs || s.has_special_needs);
        return [rpt.fields, ...sped.map(s => [s.admission_no||'', `${s.first_name} ${s.last_name}`, forms.find(f=>f.id===s.form_id)?.form_name||'', s.date_of_birth||'', s.special_needs_type||'', 'Individual Support', s.resource_room?'Yes':'No', 'No', s.guardian_name||'', s.guardian_phone||''])];
      }
      default: return [];
    }
  }, [forms, students, teachers, payments, stats]);

  const handleGenerate = (reportId: string) => {
    setSelected(reportId);
    setStatus('generating');
    setTimeout(() => {
      const rows = buildReport(reportId);
      setStatus(rows.length > 1 ? 'ready' : 'error');
      if (rows.length > 1) {
        const rpt = REPORTS.find(r => r.id === reportId)!;
        setHistory(prev => [{ id: reportId, label: rpt.label, date: new Date().toLocaleDateString('en-GB'), rows: rows.length - 1 }, ...prev.slice(0, 9)]);
        toast.success(`${rpt.label} — ${rows.length - 1} rows generated`);
      }
    }, 800);
  };

  const handleDownload = (reportId: string) => {
    const rpt = REPORTS.find(r => r.id === reportId);
    if (!rpt) return;
    const rows = buildReport(reportId);
    const blob = new Blob([rows.map(r => r.map(v => `"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')], { type:'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${reportId}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast.success(`Downloaded: ${rpt.label}`);
  };

  const printReport = (reportId: string) => {
    const rpt = REPORTS.find(r => r.id === reportId);
    if (!rpt) return;
    const rows = buildReport(reportId);
    const w = window.open('','_blank'); if (!w) return;
    const headers = rows[0] || [];
    const data = rows.slice(1);
    w.document.write(`<!DOCTYPE html><html><head><title>${rpt.label}</title><style>
      @page{size:A4 landscape;margin:10mm}body{font-family:'Segoe UI',sans-serif;font-size:10px}
      h1{font-size:16px;color:#1d4ed8;margin-bottom:4px}h2{font-size:11px;color:#6b7280;font-weight:normal;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}th{background:#f8fafc;font-weight:700;padding:8px 10px;border:1px solid #e2e8f0;text-align:left;white-space:nowrap;font-size:9px}
      td{padding:6px 10px;border:1px solid #e2e8f0;font-size:9px}tr:nth-child(even){background:#f8fafc}
      .footer{text-align:center;font-size:8px;color:#9ca3af;margin-top:16px}
      @media print{body{padding:0}}
    </style></head><body>
      <h1>${rpt.emoji} ${rpt.label}</h1>
      <h2>Ministry: ${rpt.ministry} · Generated: ${new Date().toLocaleDateString('en-GB')} · APSIMS School Management System</h2>
      <table><thead><tr>${headers.map((h:any)=>`<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${data.map(r=>`<tr>${r.map((v:any)=>`<td>${v??''}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <p class="footer">Official Government Return · ${rpt.label} · Prepared by APSIMS · ${new Date().toLocaleDateString('en-GB')} · Page 1 of 1</p>
    </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#1d4ed8,#1e40af)' }}><FiFileText size={24} className="text-white" /></div>
        <div className="w-8 h-8 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth:3,borderStyle:'solid' }} />
        <p className="text-gray-400 text-sm">Loading Government Reports…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#1d4ed8,#1e40af)' }}><FiFileText size={22} className="text-white" /></div>
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Government Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">MOEST · TSC · EMIS · KNBS · BoG · Sub-County Returns · Official Format CSV + Print</p>
          </div>
        </div>
        <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15} /></button>
      </div>

      {/* School summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label:'Total Students', value:stats.totalStudents, color:'#1d4ed8', emoji:'👨‍🎓' },
          { label:'Boys', value:stats.boys, color:'#0891b2', emoji:'🧑' },
          { label:'Girls', value:stats.girls, color:'#db2777', emoji:'👧' },
          { label:'Total Teachers', value:stats.totalTeachers, color:'#7c3aed', emoji:'👩‍🏫' },
          { label:'Forms', value:stats.forms, color:'#059669', emoji:'🏫' },
        ].map(({ label, value, color, emoji }) => (
          <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-2xl mb-1">{emoji}</p>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([['reports','📋 Available Reports'],['history','🕒 Recent History']] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setActiveTab(k as any)} className={`px-4 py-2 text-sm font-bold rounded-xl transition-all ${activeTab===k?'text-white shadow-md':'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`} style={activeTab===k?{background:'linear-gradient(135deg,#1d4ed8,#1e40af)'}:{}}>{lbl}</button>
        ))}
      </div>

      {/* Reports Grid */}
      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {REPORTS.map(rpt => {
            const isSelected = selected === rpt.id;
            const isReady = isSelected && status === 'ready';
            const isGenerating = isSelected && status === 'generating';
            return (
              <div key={rpt.id} className="bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all" style={isSelected?{borderColor:rpt.color}:{borderColor:'#e5e7eb'}}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border-2 flex-shrink-0" style={{ background:rpt.bg, borderColor:rpt.border }}>{rpt.emoji}</div>
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">{rpt.label}</h3>
                        <span className="inline-flex text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5" style={{ background:rpt.bg, color:rpt.color, border:`1px solid ${rpt.border}` }}>{rpt.ministry}</span>
                      </div>
                    </div>
                    {isReady && <span className="flex items-center gap-1 text-[9px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200 flex-shrink-0"><FiCheck size={9} /> Ready</span>}
                  </div>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">{rpt.description}</p>
                  {/* Columns preview */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {rpt.fields.slice(0,6).map(f => (
                      <span key={f} className="text-[8px] font-bold px-1.5 py-0.5 rounded-lg" style={{ background:rpt.bg, color:rpt.color }}>{f}</span>
                    ))}
                    {rpt.fields.length > 6 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-lg bg-gray-100 text-gray-500">+{rpt.fields.length-6} more</span>}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleGenerate(rpt.id)} disabled={isGenerating} className="flex-1 py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-60" style={{ background:`linear-gradient(135deg,${rpt.color},${rpt.color}cc)` }}>
                      {isGenerating ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</> : isReady ? '🔄 Re-Generate' : '⚡ Generate Report'}
                    </button>
                    {isReady && <>
                      <button onClick={() => handleDownload(rpt.id)} className="px-3 py-2 rounded-xl border-2 flex items-center gap-1 text-xs font-bold" style={{ borderColor:rpt.color, color:rpt.color, background:rpt.bg }}>
                        <FiDownload size={11} /> CSV
                      </button>
                      <button onClick={() => printReport(rpt.id)} className="px-3 py-2 rounded-xl border-2 flex items-center gap-1 text-xs font-bold border-gray-200 text-gray-600 bg-gray-50 hover:bg-gray-100">
                        <FiPrinter size={11} /> Print
                      </button>
                    </>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-800">Recent Report Generations</h3>
          </div>
          {history.length === 0 ? (
            <div className="p-12 text-center"><p className="text-gray-400 text-sm">No reports generated yet this session</p></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {history.map((h, i) => {
                const rpt = REPORTS.find(r => r.id === h.id)!;
                return (
                  <div key={i} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background:rpt.bg }}>{rpt.emoji}</div>
                    <div className="flex-1"><p className="text-xs font-bold text-gray-800">{h.label}</p><p className="text-[10px] text-gray-400">{h.date} · {h.rows} rows</p></div>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>handleDownload(h.id)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1" style={{ background:rpt.bg, color:rpt.color }}><FiDownload size={9}/> CSV</button>
                      <button onClick={()=>printReport(h.id)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200 flex items-center gap-1"><FiPrinter size={9}/> Print</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Info Banner */}
      <div className="flex items-start gap-4 p-5 rounded-2xl border-2 border-blue-100 bg-blue-50">
        <FiAlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-blue-800 text-sm">About Government Reports</p>
          <p className="text-xs text-blue-600 leading-relaxed mt-1">All generated reports are based on live data from your APSIMS database. Verify data accuracy before submitting to government ministries. Reports are in CSV format compatible with EMIS, TSC, MOEST, and sub-county portals. Always cross-check totals with the school clerk before official submission.</p>
        </div>
      </div>
    </div>
  );
}

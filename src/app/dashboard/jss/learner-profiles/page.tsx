'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiUser, FiDownload, FiPrinter, FiRefreshCw, FiSearch,
  FiCheckCircle, FiAlertCircle, FiFileText, FiAward,
  FiSend, FiEdit2, FiSave, FiX, FiGrid, FiList,
  FiCheck, FiCalendar, FiShield,
} from 'react-icons/fi';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const KICD_LAS = [
  { code: 'ENG', name: 'English',                color: '#2563EB' },
  { code: 'KSW', name: 'Kiswahili',              color: '#059669' },
  { code: 'MAT', name: 'Mathematics',            color: '#DC2626' },
  { code: 'ISC', name: 'Integrated Science',     color: '#7C3AED' },
  { code: 'SST', name: 'Social Studies',         color: '#D97706' },
  { code: 'AGR', name: 'Agriculture',            color: '#16A34A' },
  { code: 'PTS', name: 'Pre-Technical Studies',  color: '#0891B2' },
  { code: 'BUS', name: 'Business Studies',       color: '#9333EA' },
  { code: 'CAS', name: 'Creative Arts & Sports', color: '#EC4899' },
  { code: 'LSE', name: 'Life Skills Education',  color: '#06B6D4' },
  { code: 'CRE', name: 'Religious Education',    color: '#6366F1' },
];

const RUBRIC = {
  EE: { label: 'Exceeds Expectation',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  ME: { label: 'Meets Expectation',      color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  AE: { label: 'Approaches Expectation', color: '#D97706', bg: '#FEF3C7', border: '#FCD34D' },
  BE: { label: 'Below Expectation',      color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
};

const PATHWAYS = ['STEM', 'Arts & Sports', 'Social Sciences', 'TVET'];

interface Student {
  id: number; first_name: string; last_name: string; other_name?: string;
  admission_number: string; date_of_birth?: string; gender?: string;
  guardian_name?: string; guardian_phone?: string; upi_no?: string; nemis_no?: string;
  photo_url?: string;
}
interface Profile {
  id?: number; student_id: number; year: number;
  overall_competency?: string; principal_remarks?: string; teacher_remarks?: string;
  certificate_number?: string; issued_at?: string;
  nemis_submitted?: boolean; pathway_recommendation?: string;
  parent_acknowledged?: boolean;
}
interface Form { id: number; form_name: string; form_level: number; }
interface Term { id: number; term_name: string; year: number; is_current?: boolean; }

type View = 'cards' | 'list' | 'print';

export default function LearnerProfilesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<Record<number, Profile>>({});
  const [marks, setMarks] = useState<Record<number, Record<string, string>>>({});
  const [forms, setForms] = useState<Form[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [selForm, setSelForm] = useState('');
  const [selYear, setSelYear] = useState(new Date().getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>('cards');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editProfile, setEditProfile] = useState<Partial<Profile>>({});
  const [showModal, setShowModal] = useState(false);
  const [schoolName, setSchoolName] = useState('APSIMS School');

  useEffect(() => {
    const init = async () => {
      const [fR, tR, snR] = await Promise.all([
        sb.from('school_forms').select('*').order('form_level'),
        sb.from('school_terms').select('*').order('year', { ascending: false }),
        sb.from('school_settings').select('value').eq('key', 'school_name').maybeSingle(),
      ]);
      setForms(fR.data || []);
      setTerms(tR.data || []);
      if (snR.data?.value) setSchoolName(snR.data.value);
      // Default to Grade 9
      const g9 = (fR.data || []).find((f: Form) => f.form_level === 9);
      if (g9) setSelForm(String(g9.id));
      const cur = (tR.data || []).find((t: Term) => t.is_current);
      if (cur) setSelYear(cur.year);
    };
    init();
  }, []);

  const loadData = useCallback(async () => {
    if (!selForm) return;
    setLoading(true);
    try {
      const { data: studs } = await sb.from('school_students')
        .select('id,first_name,last_name,other_name,admission_number,date_of_birth,gender,guardian_name,guardian_phone,upi_no,nemis_no,photo_url')
        .eq('form_id', selForm).eq('status', 'Active').order('last_name');

      setStudents(studs || []);

      if (studs && studs.length > 0) {
        const ids = studs.map((s: Student) => s.id);

        // Load profiles
        const { data: profs } = await sb.from('jss_learner_profiles')
          .select('*').in('student_id', ids).eq('year', selYear);
        const profMap: Record<number, Profile> = {};
        (profs || []).forEach((p: Profile) => { profMap[p.student_id] = p; });
        setProfiles(profMap);

        // Load marks (latest per student per LA)
        const { data: mData } = await sb.from('jss_marks')
          .select('student_id,learning_area_id,competency_level')
          .in('student_id', ids).eq('year', selYear);

        // Load learning areas to map id->code
        const { data: laData } = await sb.from('jss_learning_areas').select('id,code');
        const laMap: Record<number, string> = {};
        (laData || []).forEach((la: any) => { laMap[la.id] = la.code; });

        const marksMap: Record<number, Record<string, string>> = {};
        (mData || []).forEach((m: any) => {
          if (!marksMap[m.student_id]) marksMap[m.student_id] = {};
          const code = laMap[m.learning_area_id] || String(m.learning_area_id);
          marksMap[m.student_id][code] = m.competency_level;
        });
        setMarks(marksMap);
      }
    } catch (e: any) { toast.error('Error loading: ' + e.message); }
    setLoading(false);
  }, [selForm, selYear]);

  useEffect(() => { if (selForm) loadData(); }, [loadData]);

  const openProfile = (student: Student) => {
    setSelectedStudent(student);
    const existing = profiles[student.id] || {};
    // Compute overall from marks
    const studentMarks = marks[student.id] || {};
    const levels = Object.values(studentMarks);
    let overall = 'ME';
    if (levels.length > 0) {
      const score = { EE: 4, ME: 3, AE: 2, BE: 1 };
      const avg = levels.reduce((a, b) => a + (score[b as keyof typeof score] || 0), 0) / levels.length;
      overall = avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : 'BE';
    }
    setEditProfile({ ...existing, student_id: student.id, year: selYear, overall_competency: existing.overall_competency || overall });
    setShowModal(true);
  };

  const saveProfile = async () => {
    if (!editProfile.student_id) return;
    setSaving(true);
    try {
      const certNo = editProfile.certificate_number || `APSIMS/${selYear}/${String(editProfile.student_id).padStart(4,'0')}`;
      const payload = { ...editProfile, year: selYear, certificate_number: certNo, generated_at: new Date().toISOString() };
      const { error } = await sb.from('jss_learner_profiles').upsert(payload, { onConflict: 'student_id,year' });
      if (error) throw error;
      toast.success('Learner profile saved!');
      setProfiles(p => ({ ...p, [editProfile.student_id!]: { ...p[editProfile.student_id!], ...payload } as Profile }));
      setShowModal(false);
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const computeOverall = (studentId: number): string => {
    const studentMarks = marks[studentId] || {};
    const levels = Object.values(studentMarks);
    if (levels.length === 0) return '—';
    const score = { EE: 4, ME: 3, AE: 2, BE: 1 };
    const avg = levels.reduce((a, b) => a + (score[b as keyof typeof score] || 0), 0) / levels.length;
    return avg >= 3.5 ? 'EE' : avg >= 2.5 ? 'ME' : avg >= 1.5 ? 'AE' : 'BE';
  };

  const exportCSV = () => {
    const laHeaders = KICD_LAS.map(la => la.code);
    const headers = ['Adm No','Student Name','UPI No','NEMIS No','Gender','DOB',...laHeaders,'Overall','Pathway','Profile Status','NEMIS Submitted'];
    const rows = filtered.map(s => {
      const sm = marks[s.id] || {};
      const prof = profiles[s.id];
      const overall = computeOverall(s.id);
      return [
        s.admission_number,`${s.first_name} ${s.last_name}`,s.upi_no||'',s.nemis_no||'',
        s.gender||'',s.date_of_birth||'',
        ...KICD_LAS.map(la => sm[la.code] || ''),
        overall, prof?.pathway_recommendation||'',
        prof ? 'Profiled' : 'Pending',
        prof?.nemis_submitted ? 'Yes' : 'No',
      ];
    });
    const csv = [headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
    a.download = `Learner_Profiles_${selYear}.csv`; a.click();
    toast.success('Exported!');
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q));
  }, [students, search]);

  const stats = useMemo(() => ({
    total: students.length,
    profiled: Object.keys(profiles).length,
    withNemis: students.filter(s => s.nemis_no).length,
    nemisSubmitted: Object.values(profiles).filter(p => p.nemis_submitted).length,
    parentAck: Object.values(profiles).filter(p => p.parent_acknowledged).length,
  }), [students, profiles]);

  // PRINT VIEW
  const PrintProfile = ({ student }: { student: Student }) => {
    const prof = profiles[student.id];
    const sm = marks[student.id] || {};
    const overall = prof?.overall_competency || computeOverall(student.id);
    const rubric = RUBRIC[overall as keyof typeof RUBRIC] || RUBRIC.ME;
    const form = forms.find(f => String(f.id) === selForm);
    return (
      <div className="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden max-w-2xl mx-auto shadow-xl print:shadow-none">
        {/* Header */}
        <div className="px-8 py-6 text-white" style={{ background: 'linear-gradient(135deg,#1E3A8A,#0D9488)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-black tracking-wide">{schoolName}</h1>
              <h2 className="text-base font-bold mt-1 text-blue-100">KICD JSS LEARNER PROFILE CERTIFICATE</h2>
              <p className="text-xs text-blue-200 mt-0.5">Junior Secondary School — Competency Based Curriculum</p>
            </div>
            <div className="text-right">
              <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center text-2xl border-2 border-white/30">🎓</div>
              <p className="text-[10px] text-blue-200 mt-1">{prof?.certificate_number || 'Pending'}</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-blue-300 text-xs mb-0.5">Student Name</p><p className="font-bold">{student.first_name} {student.other_name || ''} {student.last_name}</p></div>
            <div><p className="text-blue-300 text-xs mb-0.5">Class</p><p className="font-bold">{form?.form_name || 'Grade 9'}</p></div>
            <div><p className="text-blue-300 text-xs mb-0.5">Academic Year</p><p className="font-bold">{selYear}</p></div>
            <div><p className="text-blue-300 text-xs mb-0.5">Adm No</p><p className="font-bold">{student.admission_number}</p></div>
            <div><p className="text-blue-300 text-xs mb-0.5">UPI No</p><p className="font-bold">{student.upi_no || '—'}</p></div>
            <div><p className="text-blue-300 text-xs mb-0.5">NEMIS No</p><p className="font-bold">{student.nemis_no || '—'}</p></div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Overall Competency */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border-2" style={{ background: rubric.bg, borderColor: rubric.border }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white flex-shrink-0" style={{ background: rubric.color }}>{overall}</div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-0.5">Overall Competency Level</p>
              <p className="text-lg font-black" style={{ color: rubric.color }}>{rubric.label}</p>
              {prof?.pathway_recommendation && <p className="text-sm text-gray-600 mt-0.5">Recommended Pathway: <span className="font-bold">{prof.pathway_recommendation}</span></p>}
            </div>
          </div>

          {/* Learning Area competencies */}
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-wider mb-3">Competency Assessment — Learning Areas</p>
            <div className="grid grid-cols-2 gap-2">
              {KICD_LAS.map(la => {
                const level = sm[la.code];
                const r = level ? RUBRIC[level as keyof typeof RUBRIC] : null;
                return (
                  <div key={la.code} className="flex items-center justify-between px-3 py-2 rounded-xl border" style={{ borderColor: r?.border || '#E5E7EB', background: r?.bg || '#F9FAFB' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: la.color }} />
                      <span className="text-xs font-semibold text-gray-700">{la.name}</span>
                    </div>
                    {r ? (
                      <span className="text-xs font-black px-2 py-0.5 rounded-lg text-white" style={{ background: r.color }}>{level}</span>
                    ) : <span className="text-xs text-gray-300">—</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Remarks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Class Teacher Remarks</p>
              <p className="text-xs text-gray-700 italic min-h-[40px]">{prof?.teacher_remarks || '—'}</p>
            </div>
            <div className="border border-gray-200 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-500 uppercase mb-1">Principal Remarks</p>
              <p className="text-xs text-gray-700 italic min-h-[40px]">{prof?.principal_remarks || '—'}</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="border-t-2 pt-4 grid grid-cols-3 gap-4">
            {['Class Teacher','Principal / HM','Parent / Guardian'].map(role => (
              <div key={role} className="text-center">
                <div className="border-b-2 border-gray-300 h-10 mb-2" />
                <p className="text-[10px] font-bold text-gray-500">{role}</p>
                <p className="text-[9px] text-gray-300">Sign & Date</p>
              </div>
            ))}
          </div>

          {/* Status badges */}
          <div className="flex gap-2 flex-wrap pt-1">
            {prof?.nemis_submitted && <span className="text-[10px] font-bold px-2 py-1 bg-green-50 text-green-600 border border-green-200 rounded-lg flex items-center gap-1"><FiCheck size={9}/> NEMIS Submitted</span>}
            {prof?.parent_acknowledged && <span className="text-[10px] font-bold px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg flex items-center gap-1"><FiCheck size={9}/> Parent Acknowledged</span>}
            {prof?.issued_at && <span className="text-[10px] font-bold px-2 py-1 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg">Issued: {new Date(prof.issued_at).toLocaleDateString()}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* EDIT MODAL */}
      {showModal && selectedStudent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h3 className="font-black text-gray-800">Edit Learner Profile</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">{selectedStudent.first_name[0]}</div>
                <div>
                  <p className="font-bold text-gray-800 text-sm">{selectedStudent.first_name} {selectedStudent.last_name}</p>
                  <p className="text-xs text-gray-500">{selectedStudent.admission_number}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Overall Competency</label>
                  <select value={editProfile.overall_competency || ''} onChange={e => setEditProfile(p => ({ ...p, overall_competency: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                    <option value="">Auto (from marks)</option>
                    {Object.entries(RUBRIC).map(([k,v]) => <option key={k} value={k}>{k} - {v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Pathway Recommendation</label>
                  <select value={editProfile.pathway_recommendation || ''} onChange={e => setEditProfile(p => ({ ...p, pathway_recommendation: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300">
                    <option value="">Select Pathway</option>
                    {PATHWAYS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Teacher Remarks</label>
                <textarea value={editProfile.teacher_remarks || ''} onChange={e => setEditProfile(p => ({ ...p, teacher_remarks: e.target.value }))} rows={2}
                  placeholder="General performance and character comments..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Principal Remarks</label>
                <textarea value={editProfile.principal_remarks || ''} onChange={e => setEditProfile(p => ({ ...p, principal_remarks: e.target.value }))} rows={2}
                  placeholder="Principal's endorsement and remarks..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Date Issued</label>
                <input type="date" value={editProfile.issued_at?.slice(0,10) || ''} onChange={e => setEditProfile(p => ({ ...p, issued_at: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!editProfile.nemis_submitted} onChange={e => setEditProfile(p => ({ ...p, nemis_submitted: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-semibold text-gray-700">NEMIS Submitted</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!editProfile.parent_acknowledged} onChange={e => setEditProfile(p => ({ ...p, parent_acknowledged: e.target.checked }))} className="rounded" />
                  <span className="text-xs font-semibold text-gray-700">Parent Acknowledged</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0 sticky bottom-0 bg-white border-t">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={saveProfile} disabled={saving} className="flex-1 py-2.5 font-bold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg,#1E3A8A,#0D9488)' }}>
                {saving ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSave size={14} />}
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                style={{ background: 'linear-gradient(135deg,#1E3A8A,#0D9488)' }}>
                <FiAward size={18} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">JSS Learner Profiles</h1>
                <p className="text-xs text-gray-400">KICD Competency Certificate · Grade 9 · CBC End-of-Cycle</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {view === 'print' && selectedStudent && (
                <>
                  <button onClick={() => setView('cards')} className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Back</button>
                  <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"><FiPrinter size={14}/> Print</button>
                </>
              )}
              <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl"><FiDownload size={14}/> Export CSV</button>
              <div className="flex border border-gray-200 rounded-xl overflow-hidden">
                {([['cards','Cards'],['list','List']] as [View,string][]).map(([v,l]) => (
                  <button key={v} onClick={() => setView(v)} className={`px-3 py-2 text-sm transition ${view===v?'bg-blue-600 text-white font-bold':'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <select value={selForm} onChange={e => setSelForm(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[150px] focus:ring-2 focus:ring-blue-300 outline-none">
              <option value="">All JSS Classes</option>
              {forms.filter(f => f.form_level >= 7 && f.form_level <= 9).map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              {forms.filter(f => f.form_level >= 7 && f.form_level <= 9).length === 0 &&
                forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
            <select value={selYear} onChange={e => setSelYear(Number(e.target.value))}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[120px] focus:ring-2 focus:ring-blue-300 outline-none">
              {[2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="relative flex-1 min-w-[180px]">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Students', value: stats.total, color: '#1E3A8A' },
            { label: 'Profiles Created', value: stats.profiled, color: '#059669' },
            { label: 'With NEMIS No', value: stats.withNemis, color: '#0891B2' },
            { label: 'NEMIS Submitted', value: stats.nemisSubmitted, color: '#7C3AED' },
            { label: 'Parent Acknowledged', value: stats.parentAck, color: '#D97706' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              {stats.total > 0 && <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width:`${Math.round((value/stats.total)*100)}%`, background: color }} /></div>}
            </div>
          ))}
        </div>

        {!selForm ? (
          <div className="flex flex-col items-center justify-center h-56 bg-white rounded-2xl border border-gray-200">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-3"><FiAward size={24} className="text-blue-400"/></div>
            <h3 className="font-bold text-gray-700 mb-1">Select a Class</h3>
            <p className="text-sm text-gray-400">Choose a JSS class (Grade 7, 8 or 9) to view learner profiles</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-40 bg-white rounded-2xl border border-gray-200">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-400">Loading learner profiles...</p>
            </div>
          </div>
        ) : view === 'print' && selectedStudent ? (
          <PrintProfile student={selectedStudent} />
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 bg-white rounded-2xl border border-gray-200">
            <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-3"><FiAlertCircle size={24} className="text-amber-400"/></div>
            <h3 className="font-bold text-gray-700 mb-1">No Students Found</h3>
            <p className="text-sm text-gray-400">No active students in this class. Assign students to this class first.</p>
          </div>
        ) : view === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(student => {
              const prof = profiles[student.id];
              const sm = marks[student.id] || {};
              const overall = prof?.overall_competency || computeOverall(student.id);
              const rubric = RUBRIC[overall as keyof typeof RUBRIC];
              const markCount = Object.keys(sm).length;
              return (
                <div key={student.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition overflow-hidden">
                  <div className="h-1.5" style={{ background: rubric ? `linear-gradient(90deg,${rubric.color}44,${rubric.color})` : '#E5E7EB' }} />
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#1E3A8A,#0D9488)' }}>
                        {student.first_name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-800 text-sm">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-gray-400">{student.admission_number}</p>
                        {student.upi_no && <p className="text-[10px] text-gray-400">UPI: {student.upi_no}</p>}
                      </div>
                      {rubric && overall !== '—' ? (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0" style={{ background: rubric.color }}>{overall}</div>
                      ) : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-gray-300 font-black border-2 border-dashed border-gray-200">—</div>}
                    </div>

                    {/* LA badges */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {KICD_LAS.map(la => {
                        const level = sm[la.code];
                        const r = level ? RUBRIC[level as keyof typeof RUBRIC] : null;
                        return (
                          <span key={la.code} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                            style={{ background: r?.bg || '#F3F4F6', color: r?.color || '#9CA3AF', border: `1px solid ${r?.border || '#E5E7EB'}` }}>
                            {la.code}{level ? `:${level}` : ''}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {prof?.pathway_recommendation && <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg font-semibold">{prof.pathway_recommendation}</span>}
                      {prof?.nemis_submitted && <span className="text-[10px] px-1.5 py-0.5 bg-green-50 text-green-600 border border-green-200 rounded-lg font-bold flex items-center gap-1"><FiShield size={9}/> NEMIS</span>}
                      {prof?.parent_acknowledged && <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-bold flex items-center gap-1"><FiCheck size={9}/> Parent</span>}
                    </div>
                    <p className="text-[10px] text-gray-400">{markCount} of {KICD_LAS.length} LAs assessed</p>
                  </div>
                  <div className="border-t border-gray-100 px-4 py-2.5 bg-gray-50 flex gap-2 items-center">
                    <button onClick={() => openProfile(student)} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"><FiEdit2 size={11}/> Edit Profile</button>
                    <span className="text-gray-200">|</span>
                    <button onClick={() => { setSelectedStudent(student); setView('print'); }} className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:underline"><FiPrinter size={11}/> Print Certificate</button>
                    {!prof && <span className="ml-auto text-[10px] text-amber-500 font-bold">Pending</span>}
                    {prof && <span className="ml-auto text-[10px] text-green-500 font-bold flex items-center gap-1"><FiCheckCircle size={10}/> Profiled</span>}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    {['Student','Adm No','UPI / NEMIS','Overall','Pathway','Marks','NEMIS','Parent','Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((student, idx) => {
                    const prof = profiles[student.id];
                    const sm = marks[student.id] || {};
                    const overall = prof?.overall_competency || computeOverall(student.id);
                    const rubric = RUBRIC[overall as keyof typeof RUBRIC];
                    return (
                      <tr key={student.id} className={`border-b border-gray-100 hover:bg-blue-50/20 ${idx%2===0?'bg-white':'bg-gray-50/20'}`}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg text-white flex items-center justify-center font-black text-xs flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg,#1E3A8A,#0D9488)' }}>{student.first_name[0]}</div>
                            <p className="text-xs font-semibold text-gray-800">{student.first_name} {student.last_name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs font-mono text-gray-600">{student.admission_number}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{student.upi_no || '—'} / {student.nemis_no || '—'}</td>
                        <td className="px-4 py-2.5">
                          {rubric && overall !== '—' ? (
                            <span className="text-xs font-black px-2 py-1 rounded-lg text-white" style={{ background: rubric.color }}>{overall}</span>
                          ) : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{prof?.pathway_recommendation || '—'}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{Object.keys(sm).length}/{KICD_LAS.length}</td>
                        <td className="px-4 py-2.5">{prof?.nemis_submitted ? <FiCheckCircle size={14} className="text-green-500"/> : <FiX size={14} className="text-gray-300"/>}</td>
                        <td className="px-4 py-2.5">{prof?.parent_acknowledged ? <FiCheckCircle size={14} className="text-blue-500"/> : <FiX size={14} className="text-gray-300"/>}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => openProfile(student)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500"><FiEdit2 size={12}/></button>
                            <button onClick={() => { setSelectedStudent(student); setView('print'); }} className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-500"><FiPrinter size={12}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <style jsx global>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  );
}

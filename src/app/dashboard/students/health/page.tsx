'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import {
  FiRefreshCw,
  FiSearch,
  FiPlus,
  FiActivity,
  FiAlertTriangle,
  FiHeart,
  FiPhone,
  FiUserCheck,
  FiCheckCircle,
  FiClock,
  FiExternalLink,
  FiDownload,
  FiPrinter,
  FiTrash2,
  FiEdit2,
  FiChevronLeft,
  FiChevronRight,
  FiShield,
  FiUser,
  FiCalendar,
  FiLayers,
  FiEye,
  FiSend,
} from 'react-icons/fi';

import { exportHealthWorkbook } from '@/components/health/UltraHealthExport';
import { UltraReferralLetterModal } from '@/components/health/UltraReferralLetterModal';
import {
  UltraClinicVisitModal,
  UltraStudentEhrModal,
  UltraAllergyModal,
  UltraEmergencyContactModal,
} from '@/components/health/UltraHealthModals';

export default function StudentHealthPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);

  // Navigation & Filter State
  const [activeTab, setActiveTab] = useState<'clinic' | 'referrals' | 'ehr' | 'allergies' | 'emergency'>('clinic');
  const [curriculumTrack, setCurriculumTrack] = useState<'all' | 'cbc-senior' | '8-4-4' | 'jss' | 'primary'>('all');
  const [clinicTriageFilter, setClinicTriageFilter] = useState<'all' | 'observed' | 'discharged' | 'referred'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  // Modals State
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showEhrModal, setShowEhrModal] = useState(false);
  const [showAllergyModal, setShowAllergyModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [selectedVisitForLetter, setSelectedVisitForLetter] = useState<any | null>(null);
  const [editEhrRecord, setEditEhrRecord] = useState<any | null>(null);
  const [selectedStudentIdForEhr, setSelectedStudentIdForEhr] = useState<number | undefined>(undefined);

  /* ── 1. Fetch All Health & Clinical Data ───────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [
        { data: sData, error: sErr },
        { data: rData },
        { data: aData },
        { data: vData },
        { data: cData },
        { data: fmData },
      ] = await Promise.all([
        supabase
          .from('school_students')
          .select('id, first_name, last_name, admission_number, form_id, stream_id, status, guardian_phone')
          .eq('status', 'Active')
          .order('last_name'),
        supabase.from('school_health_records').select('*'),
        supabase.from('school_health_allergies').select('*'),
        supabase.from('school_clinic_visits').select('*').order('visit_date', { ascending: false }),
        supabase.from('school_emergency_contacts').select('*'),
        supabase.from('school_forms').select('*').order('form_level'),
      ]);

      if (sErr) throw sErr;

      setStudents(sData || []);
      setRecords(rData || []);
      setAllergies(aData || []);
      setVisits(vData || []);
      setContacts(cData || []);
      setForms(fmData || []);
    } catch (err: any) {
      toast.error(`Error loading health data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ── 2. Helpers & Lookup ───────────────────────────────────────────────── */
  const getStudent = (id: number) => students.find((s) => s.id === id);
  const getRecord = (sid: number) => records.find((r) => r.student_id === sid);

  const getFormDisplay = (formId?: number) => {
    if (!formId) return { label: 'General', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    const f = forms.find((fm) => fm.id === formId);
    if (!f) return { label: `Form ${formId}`, color: 'bg-slate-50 text-slate-700 border-slate-200' };

    const lvl = Number(f.form_level);
    if (lvl === 10) return { label: 'Grade 10 (Senior CBC)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (lvl === 11) return { label: 'Grade 11 (Senior CBC)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (lvl === 12) return { label: 'Grade 12 (Senior CBC)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    if (lvl >= 7 && lvl <= 9) return { label: `Grade ${lvl} (JSS)`, color: 'bg-teal-50 text-teal-700 border-teal-200' };
    if (lvl >= 1 && lvl <= 4) return { label: `Form ${lvl}`, color: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: f.form_name, color: 'bg-slate-50 text-slate-700 border-slate-200' };
  };

  /* ── 3. Filtered Lists ─────────────────────────────────────────────────── */
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const todayVisits = visits.filter((v) => v.visit_date === todayStr);
  const observedVisits = visits.filter((v) => !v.discharged && !v.referred_to);
  const hospitalReferrals = visits.filter((v) => !!v.referred_to);
  const severeAllergies = allergies.filter((a) => a.severity === 'Severe' || a.severity === 'Life-Threatening');

  // Filtered Students by Curriculum
  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (curriculumTrack === 'cbc-senior') {
      result = result.filter((s) => {
        const fm = forms.find((f) => f.id === s.form_id);
        return [10, 11, 12].includes(Number(fm?.form_level));
      });
    } else if (curriculumTrack === '8-4-4') {
      result = result.filter((s) => {
        const fm = forms.find((f) => f.id === s.form_id);
        return [1, 2, 3, 4].includes(Number(fm?.form_level));
      });
    } else if (curriculumTrack === 'jss') {
      result = result.filter((s) => {
        const fm = forms.find((f) => f.id === s.form_id);
        return [7, 8, 9].includes(Number(fm?.form_level));
      });
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(q)
      );
    }
    return result;
  }, [students, forms, curriculumTrack, search]);

  // Filtered Visits
  const filteredVisits = useMemo(() => {
    let result = [...visits];
    if (clinicTriageFilter === 'observed') {
      result = result.filter((v) => !v.discharged && !v.referred_to);
    } else if (clinicTriageFilter === 'discharged') {
      result = result.filter((v) => v.discharged);
    } else if (clinicTriageFilter === 'referred') {
      result = result.filter((v) => !!v.referred_to);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((v) => {
        const st = getStudent(v.student_id);
        const stStr = st ? `${st.first_name} ${st.last_name} ${st.admission_number}`.toLowerCase() : '';
        return (
          stStr.includes(q) ||
          (v.complaint || '').toLowerCase().includes(q) ||
          (v.diagnosis || '').toLowerCase().includes(q) ||
          (v.referred_to || '').toLowerCase().includes(q) ||
          (v.attended_by || '').toLowerCase().includes(q)
        );
      });
    }
    return result;
  }, [visits, students, clinicTriageFilter, search]);

  // Pagination for current active tab
  const pagedVisits = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredVisits.slice(start, start + PAGE_SIZE);
  }, [filteredVisits, page]);

  const pagedStudents = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredStudents.slice(start, start + PAGE_SIZE);
  }, [filteredStudents, page]);

  /* ── 4. Action Handlers ────────────────────────────────────────────────── */
  const handleDeleteVisit = async (id: number) => {
    if (!confirm('Are you sure you want to delete this clinical encounter record?')) return;
    try {
      const { error } = await supabase.from('school_clinic_visits').delete().eq('id', id);
      if (error) throw error;
      toast.success('Visit record removed.');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDischargeVisit = async (visitId: number) => {
    try {
      const { error } = await supabase
        .from('school_clinic_visits')
        .update({
          discharged: true,
          discharge_time: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
        })
        .eq('id', visitId);
      if (error) throw error;
      toast.success('✓ Student discharged and cleared to return to class!');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteAllergy = async (id: number) => {
    if (!confirm('Remove this allergy alert?')) return;
    try {
      const { error } = await supabase.from('school_health_allergies').delete().eq('id', id);
      if (error) throw error;
      toast.success('Allergy record removed.');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Delete this emergency contact?')) return;
    try {
      const { error } = await supabase.from('school_emergency_contacts').delete().eq('id', id);
      if (error) throw error;
      toast.success('Contact removed.');
      fetchAll();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-72 gap-3 animate-fadeIn">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center text-2xl shadow-lg">
          🏥
        </div>
        <p className="text-xs font-black text-slate-500 animate-pulse">
          Connecting to Student Electronic Health Registry...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn pb-14" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── 1. Executive Frosted Health Command Header ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          
          {/* Title & Live Status */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-500 text-white flex items-center justify-center text-xl shadow-md shadow-emerald-500/20 flex-shrink-0">
              🏥
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  Student Health &amp; Clinic Command Center
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Sick Bay &amp; Triage Ready
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Electronic Health Records (EHR)</span>
                <span className="text-slate-300">•</span>
                <span>Outpatient Triage &amp; Vitals</span>
                <span className="text-slate-300">•</span>
                <span>Hospital Referral System &amp; Critical Watchlist</span>
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={fetchAll}
              className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition shadow-xs active:scale-95"
              title="Refresh Health Records"
            >
              <FiRefreshCw size={14} />
            </button>

            <button
              onClick={() => setShowVisitModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm active:scale-95"
            >
              <span>🩺 Record Clinic Visit</span>
            </button>

            <button
              onClick={() => {
                setShowEhrModal(true);
                setEditEhrRecord(null);
                setSelectedStudentIdForEhr(undefined);
              }}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 transition shadow-xs active:scale-95"
            >
              <span>📋 Health Bio (EHR)</span>
            </button>

            <button
              onClick={() => setShowAllergyModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 transition shadow-xs active:scale-95"
            >
              <span>⚠️ Add Allergy</span>
            </button>

            <button
              onClick={() => setShowContactModal(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-black bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-800 transition shadow-xs active:scale-95"
            >
              <span>🆘 Emergency</span>
            </button>

            <button
              onClick={() =>
                exportHealthWorkbook({
                  students,
                  records,
                  visits,
                  allergies,
                  contacts,
                  forms,
                })
              }
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black bg-slate-900 hover:bg-slate-800 text-white transition shadow-sm active:scale-95"
            >
              <FiDownload size={13} />
              <span>Export Excel</span>
            </button>
          </div>

        </div>
      </div>

      {/* ── 2. Clinical Command HUD (6 KPI Cards) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { label: 'EHR Baselines', val: records.length, sub: 'Registered Profiles', icon: '📋', color: 'text-blue-700', bg: 'bg-blue-50/70 border-blue-200' },
          { label: 'Clinic Visits', val: visits.length, sub: `${todayVisits.length} Today`, icon: '🩺', color: 'text-emerald-700', bg: 'bg-emerald-50/70 border-emerald-200' },
          { label: 'In Sick Bay', val: observedVisits.length, sub: 'Under Observation', icon: '🏥', color: 'text-amber-700', bg: 'bg-amber-50/70 border-amber-200' },
          { label: 'Hospital Referrals', val: hospitalReferrals.length, sub: 'Transferred Out', icon: '🚑', color: 'text-rose-700', bg: 'bg-rose-50/70 border-rose-200' },
          { label: 'Severe Allergies', val: severeAllergies.length, sub: 'Anaphylaxis Alert', icon: '⚠️', color: 'text-red-700', bg: 'bg-red-50/70 border-red-200' },
          { label: 'Emergency Contacts', val: contacts.length, sub: `${contacts.filter((c) => c.is_primary).length} Primary`, icon: '🆘', color: 'text-purple-700', bg: 'bg-purple-50/70 border-purple-200' },
        ].map((c) => (
          <div key={c.label} className={`p-3 rounded-2xl border transition-all ${c.bg}`}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">{c.label}</span>
              <span className="text-base">{c.icon}</span>
            </div>
            <p className={`text-2xl font-black font-mono tracking-tight ${c.color}`}>{c.val}</p>
            <p className="text-[10px] font-medium text-slate-500 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* ── 3. Dual-Track Curriculum Switcher & Primary Tabs ── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 space-y-3">
        
        {/* Curriculum Switcher Pills */}
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Curriculum Track:</span>
            {[
              { id: 'all', label: 'All Curriculums' },
              { id: 'cbc-senior', label: '🇰🇪 CBC Senior School (Grades 10–12)' },
              { id: '8-4-4', label: '📘 8-4-4 Secondary (Forms 1–4)' },
              { id: 'jss', label: '🎓 Junior Secondary (Grades 7–9)' },
            ].map((trk) => (
              <button
                key={trk.id}
                onClick={() => {
                  setCurriculumTrack(trk.id as any);
                  setPage(1);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-black transition ${
                  curriculumTrack === trk.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {trk.label}
              </button>
            ))}
          </div>
        </div>

        {/* Primary Functional Tabs */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
            {[
              { id: 'clinic', label: '🩺 Outpatient Clinic & Triage', count: visits.length },
              { id: 'referrals', label: '🚑 Hospital Referrals Log', count: hospitalReferrals.length },
              { id: 'ehr', label: '📋 Master EHR Registry', count: students.length },
              { id: 'allergies', label: '⚠️ Allergies Watchlist', count: allergies.length },
              { id: 'emergency', label: '🆘 Emergency Contacts', count: contacts.length },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-black whitespace-nowrap transition ${
                  activeTab === t.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{t.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeTab === t.id ? 'bg-slate-100 font-bold' : 'opacity-60'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[220px]">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search student, diagnosis, symptom..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

      </div>

      {/* ── 4. TAB 1: OUTPATIENT CLINIC & TRIAGE ── */}
      {activeTab === 'clinic' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3">
          
          {/* Sub-Filters: Triage Status */}
          <div className="p-3 px-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-1">Triage Filter:</span>
              {[
                { id: 'all', label: 'All Encounters', count: visits.length },
                { id: 'observed', label: '🏥 Under Observation', count: observedVisits.length },
                { id: 'discharged', label: '✓ Treated & Discharged', count: visits.filter((v) => v.discharged).length },
                { id: 'referred', label: '🚑 Hospital Referrals', count: hospitalReferrals.length },
              ].map((flt) => (
                <button
                  key={flt.id}
                  onClick={() => {
                    setClinicTriageFilter(flt.id as any);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    clinicTriageFilter === flt.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span>{flt.label} </span>
                  <span className="opacity-80">({flt.count})</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Showing {filteredVisits.length} visits
            </p>
          </div>

          {/* Visits Datagrid */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 font-bold">
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Date &amp; Time</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Patient / Student</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Vitals (Triage)</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Chief Complaint</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Diagnosis</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Medication Given</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Disposition / Status</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider">Attended By</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase tracking-wider text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedVisits.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      <span className="text-3xl block mb-2">🩺</span>
                      <p className="text-sm font-bold text-slate-700">No clinical visits recorded</p>
                      <p className="text-xs mt-0.5">Click "Record Clinic Visit" to log an encounter.</p>
                    </td>
                  </tr>
                ) : (
                  pagedVisits.map((v) => {
                    const st = getStudent(v.student_id);
                    const formInfo = getFormDisplay(st?.form_id);
                    const isReferred = !!v.referred_to;
                    const highTemp = v.temperature && v.temperature >= 38;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50/70 transition">
                        <td className="px-3.5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {v.visit_date}
                        </td>

                        <td className="px-3.5 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs flex-shrink-0">
                              {(st?.first_name || 'S')[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 leading-tight">
                                {st ? `${st.last_name}, ${st.first_name}` : '—'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[10px] font-mono text-slate-400">{st?.admission_number}</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${formInfo.color}`}>
                                  {formInfo.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Vitals */}
                        <td className="px-3.5 py-3 whitespace-nowrap font-mono text-xs">
                          {v.temperature ? (
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded font-bold mr-1 ${
                                highTemp ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'text-slate-700 bg-slate-100'
                              }`}
                            >
                              {highTemp && '🔥 '}{v.temperature}°C
                            </span>
                          ) : null}
                          {v.blood_pressure && (
                            <span className="text-[10px] text-slate-500 font-bold">{v.blood_pressure}</span>
                          )}
                          {!v.temperature && !v.blood_pressure && <span className="text-slate-300">—</span>}
                        </td>

                        {/* Complaint */}
                        <td className="px-3.5 py-3 text-slate-800 max-w-[180px]">
                          <p className="truncate font-medium" title={v.complaint}>{v.complaint}</p>
                        </td>

                        {/* Diagnosis */}
                        <td className="px-3.5 py-3 text-slate-700 max-w-[150px]">
                          <p className="truncate font-bold" title={v.diagnosis || '—'}>{v.diagnosis || '—'}</p>
                        </td>

                        {/* Medication */}
                        <td className="px-3.5 py-3 text-slate-600 max-w-[150px]">
                          <p className="truncate font-mono text-[11px]" title={v.medication_given || '—'}>
                            {v.medication_given || '—'}
                          </p>
                        </td>

                        {/* Status / Disposition */}
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          {isReferred ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                              🚑 REFERRED ({v.referred_to})
                            </span>
                          ) : v.discharged ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Discharged
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              🏥 In Sick Bay
                            </span>
                          )}
                        </td>

                        {/* Attended By */}
                        <td className="px-3.5 py-3 text-[11px] text-slate-500 whitespace-nowrap">
                          {v.attended_by || 'Staff Nurse'}
                        </td>

                        {/* Actions */}
                        <td className="px-3.5 py-3 text-right pr-4 whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* If in sick bay, allow discharge */}
                            {!v.discharged && !isReferred && (
                              <button
                                onClick={() => handleDischargeVisit(v.id)}
                                className="p-1 px-2 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                                title="Discharge patient back to class"
                              >
                                ✓ Discharge
                              </button>
                            )}

                            {/* If referred, allow printing referral letter */}
                            {isReferred && (
                              <button
                                onClick={() => setSelectedVisitForLetter(v)}
                                className="p-1 px-2 rounded-lg text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1"
                                title="Print Official Ministry Referral Letter"
                              >
                                <FiPrinter size={11} />
                                <span>Referral Letter</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteVisit(v.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 transition"
                              title="Delete visit"
                            >
                              <FiTrash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredVisits.length > PAGE_SIZE && (
            <div className="p-3 px-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <p>Page {page} of {Math.ceil(filteredVisits.length / PAGE_SIZE)}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white disabled:opacity-30"
                >
                  <FiChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * PAGE_SIZE >= filteredVisits.length}
                  className="p-1 rounded-lg border border-slate-200 bg-white disabled:opacity-30"
                >
                  <FiChevronRight size={13} />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ── 5. TAB 2: HOSPITAL REFERRALS LOG ── */}
      {activeTab === 'referrals' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-slate-100 bg-rose-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚑</span>
              <div>
                <h3 className="text-sm font-black text-rose-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  External Hospital &amp; Specialist Medical Referrals Log
                </h3>
                <p className="text-[11px] text-rose-700">Official patient transfer records with hospital dispatch letters</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-200">
              {hospitalReferrals.length} Medical Transfer{hospitalReferrals.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="px-3.5 py-3 text-[10px] uppercase">Transfer Date</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Patient / Student</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Receiving Hospital</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Clinical Findings / Reason</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Pre-Transfer Care</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Attending Nurse</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase text-right pr-4">Print Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospitalReferrals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      <span className="text-3xl block mb-2">🚑</span>
                      <p className="text-sm font-bold text-slate-700">No hospital referrals recorded</p>
                      <p className="text-xs mt-0.5">Students referred to external facilities will automatically show here.</p>
                    </td>
                  </tr>
                ) : (
                  hospitalReferrals.map((v) => {
                    const st = getStudent(v.student_id);
                    const formInfo = getFormDisplay(st?.form_id);
                    return (
                      <tr key={v.id} className="hover:bg-rose-50/20 transition">
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-600">{v.visit_date}</td>
                        <td className="px-3.5 py-3">
                          <p className="font-bold text-slate-900">{st ? `${st.last_name}, ${st.first_name}` : '—'}</p>
                          <span className="text-[10px] font-mono text-slate-400">Adm: {st?.admission_number}</span>
                        </td>
                        <td className="px-3.5 py-3 font-bold text-rose-700">{v.referred_to}</td>
                        <td className="px-3.5 py-3 text-slate-800 max-w-[200px]">
                          <p className="truncate" title={v.notes || v.complaint}>{v.notes || v.complaint}</p>
                        </td>
                        <td className="px-3.5 py-3 text-slate-600 max-w-[160px]">
                          <p className="truncate" title={v.treatment || '—'}>{v.treatment || '—'}</p>
                        </td>
                        <td className="px-3.5 py-3 text-slate-500">{v.attended_by || 'Staff Nurse'}</td>
                        <td className="px-3.5 py-3 text-right pr-4">
                          <button
                            onClick={() => setSelectedVisitForLetter(v)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition active:scale-95"
                          >
                            <FiPrinter size={12} />
                            <span>Print Transfer Letter</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 6. TAB 3: MASTER EHR BASELINE REGISTRY ── */}
      {activeTab === 'ehr' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3">
          <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                Student Electronic Health Records (EHR)
              </h3>
              <p className="text-[11px] text-slate-400">Baseline growth metrics, blood groups, vision, and chronic conditions</p>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              {filteredStudents.length} Students Registered
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="px-3.5 py-3 text-[10px] uppercase">#</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Student Name</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Class</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Blood / Genotype</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Growth &amp; BMI</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Vision (L/R)</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Chronic Conditions</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Medications</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase text-right pr-4">Edit EHR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedStudents.map((st, idx) => {
                  const rec = getRecord(st.id);
                  const formInfo = getFormDisplay(st.form_id);
                  const bmi =
                    rec?.height_cm && rec?.weight_kg
                      ? (rec.weight_kg / Math.pow(rec.height_cm / 100, 2)).toFixed(1)
                      : null;

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-3.5 py-3 text-slate-400 font-mono">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-3.5 py-3">
                        <strong className="text-slate-900 block">{st.last_name}, {st.first_name}</strong>
                        <span className="text-[10px] font-mono text-slate-400">Adm: {st.admission_number}</span>
                      </td>
                      <td className="px-3.5 py-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${formInfo.color}`}>
                          {formInfo.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3">
                        {rec?.blood_group ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            🩸 {rec.blood_group} {rec.genotype ? `(${rec.genotype})` : ''}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 font-mono">
                        {bmi ? (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            Number(bmi) < 18.5 ? 'bg-amber-50 text-amber-800' : Number(bmi) <= 24.9 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                          }`}>
                            BMI {bmi}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 text-[11px] text-slate-600 font-mono">
                        {rec?.vision_left ? `${rec.vision_left} / ${rec.vision_right || '6/6'}` : '—'}
                      </td>
                      <td className="px-3.5 py-3 max-w-[160px]">
                        <p className="truncate text-[11px] text-slate-800 font-medium" title={rec?.chronic_conditions || 'None'}>
                          {rec?.chronic_conditions || 'None'}
                        </p>
                      </td>
                      <td className="px-3.5 py-3 max-w-[140px]">
                        <p className="truncate text-[10px] text-slate-600 font-mono" title={rec?.current_medications || 'None'}>
                          {rec?.current_medications || 'None'}
                        </p>
                      </td>
                      <td className="px-3.5 py-3 text-right pr-4">
                        <button
                          onClick={() => {
                            setEditEhrRecord(rec || null);
                            setSelectedStudentIdForEhr(st.id);
                            setShowEhrModal(true);
                          }}
                          className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                          title="Edit health baseline"
                        >
                          <FiEdit2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {filteredStudents.length > PAGE_SIZE && (
            <div className="p-3 px-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <p>Page {page} of {Math.ceil(filteredStudents.length / PAGE_SIZE)}</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-lg border border-slate-200 bg-white disabled:opacity-30"
                >
                  <FiChevronLeft size={13} />
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * PAGE_SIZE >= filteredStudents.length}
                  className="p-1 rounded-lg border border-slate-200 bg-white disabled:opacity-30"
                >
                  <FiChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── 7. TAB 4: CRITICAL ALLERGIES WATCHLIST ── */}
      {activeTab === 'allergies' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-slate-100 bg-amber-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="text-sm font-black text-amber-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  Critical Allergies &amp; Anaphylaxis Safety Registry
                </h3>
                <p className="text-[11px] text-amber-800">Critical safety alerts for dining hall, dormitory &amp; first aid responders</p>
              </div>
            </div>
            <button
              onClick={() => setShowAllergyModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition"
            >
              + Add Allergy Alert
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="px-3.5 py-3 text-[10px] uppercase">Student</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Allergen Trigger</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Severity Rating</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Reaction Symptoms</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Emergency Action Protocol</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase text-right pr-4">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allergies.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center text-slate-400">
                      <span className="text-3xl block mb-2">⚠️</span>
                      <p className="text-sm font-bold text-slate-700">No allergy alerts recorded</p>
                      <p className="text-xs mt-0.5">Click "Add Allergy Alert" to register a student's safety protocol.</p>
                    </td>
                  </tr>
                ) : (
                  allergies.map((a) => {
                    const st = getStudent(a.student_id);
                    const isSevere = a.severity === 'Severe' || a.severity === 'Life-Threatening';
                    return (
                      <tr key={a.id} className="hover:bg-amber-50/20 transition">
                        <td className="px-3.5 py-3">
                          <p className="font-bold text-slate-900">{st ? `${st.last_name}, ${st.first_name}` : '—'}</p>
                          <span className="text-[10px] font-mono text-slate-400">{st?.admission_number}</span>
                        </td>
                        <td className="px-3.5 py-3 font-black text-slate-900 text-xs">
                          {a.allergy_type}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              isSevere
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {a.severity}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-slate-700 max-w-[180px]">
                          <p className="truncate" title={a.description || '—'}>{a.description || '—'}</p>
                        </td>
                        <td className="px-3.5 py-3 text-slate-800 max-w-[220px]">
                          <p className="truncate font-medium text-emerald-800" title={a.treatment || '—'}>
                            {a.treatment || 'Standard first aid & monitoring'}
                          </p>
                        </td>
                        <td className="px-3.5 py-3 text-right pr-4">
                          <button
                            onClick={() => handleDeleteAllergy(a.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 transition"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 8. TAB 5: EMERGENCY CONTACTS MATRIX ── */}
      {activeTab === 'emergency' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-3">
          <div className="p-4 border-b border-slate-100 bg-purple-50/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🆘</span>
              <div>
                <h3 className="text-sm font-black text-purple-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                  Student Emergency Contacts &amp; Hospital Authorization Matrix
                </h3>
                <p className="text-[11px] text-purple-800">Verified parent phone numbers and emergency dispatch authorization</p>
              </div>
            </div>
            <button
              onClick={() => setShowContactModal(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-xs transition"
            >
              + Add Contact
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="px-3.5 py-3 text-[10px] uppercase">Student</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Emergency Contact Name</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Relationship</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Primary Phone</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Alt Phone</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Email</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase">Priority</th>
                  <th className="px-3.5 py-3 text-[10px] uppercase text-right pr-4">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contacts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-16 text-center text-slate-400">
                      <span className="text-3xl block mb-2">🆘</span>
                      <p className="text-sm font-bold text-slate-700">No emergency contacts registered</p>
                      <p className="text-xs mt-0.5">Click "Add Contact" to register parent emergency lines.</p>
                    </td>
                  </tr>
                ) : (
                  contacts.map((c) => {
                    const st = getStudent(c.student_id);
                    return (
                      <tr key={c.id} className="hover:bg-purple-50/20 transition">
                        <td className="px-3.5 py-3">
                          <p className="font-bold text-slate-900">{st ? `${st.last_name}, ${st.first_name}` : '—'}</p>
                          <span className="text-[10px] font-mono text-slate-400">{st?.admission_number}</span>
                        </td>
                        <td className="px-3.5 py-3 font-bold text-slate-900">
                          {c.contact_name}
                        </td>
                        <td className="px-3.5 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            {c.relationship || 'Parent'}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                          <a href={`tel:${c.phone}`} className="hover:underline flex items-center gap-1">
                            <FiPhone size={10} />
                            <span>{c.phone}</span>
                          </a>
                        </td>
                        <td className="px-3.5 py-3 font-mono text-slate-500">{c.phone2 || '—'}</td>
                        <td className="px-3.5 py-3 text-slate-600">{c.email || '—'}</td>
                        <td className="px-3.5 py-3">
                          {c.is_primary ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              ⭐ PRIMARY
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Secondary</span>
                          )}
                        </td>
                        <td className="px-3.5 py-3 text-right pr-4">
                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 transition"
                          >
                            <FiTrash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── 9. MODALS SUITE ── */}

      {/* Record Clinic Visit Modal */}
      <UltraClinicVisitModal
        isOpen={showVisitModal}
        onClose={() => setShowVisitModal(false)}
        onSuccess={fetchAll}
        students={students}
      />

      {/* Student Health Baseline (EHR) Modal */}
      <UltraStudentEhrModal
        isOpen={showEhrModal}
        onClose={() => setShowEhrModal(false)}
        onSuccess={fetchAll}
        students={students}
        existingRecord={editEhrRecord}
        selectedStudentId={selectedStudentIdForEhr}
      />

      {/* Allergy Modal */}
      <UltraAllergyModal
        isOpen={showAllergyModal}
        onClose={() => setShowAllergyModal(false)}
        onSuccess={fetchAll}
        students={students}
      />

      {/* Emergency Contact Modal */}
      <UltraEmergencyContactModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        onSuccess={fetchAll}
        students={students}
      />

      {/* Hospital Referral Letter Print Modal */}
      {selectedVisitForLetter && (
        <UltraReferralLetterModal
          visit={selectedVisitForLetter}
          student={getStudent(selectedVisitForLetter.student_id)}
          record={getRecord(selectedVisitForLetter.student_id)}
          contacts={contacts.filter((c) => c.student_id === selectedVisitForLetter.student_id)}
          isOpen={true}
          onClose={() => setSelectedVisitForLetter(null)}
        />
      )}

    </div>
  );
}

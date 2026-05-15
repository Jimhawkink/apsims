'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiRefreshCw } from 'react-icons/fi';
import { RecordModal, VisitModal, AllergyModal, ContactModal } from './modals';
import RecordsTab from './RecordsTab';
import VisitsTab from './VisitsTab';
import EmergencyTab from './EmergencyTab';

export default function StudentHealthPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [allergies, setAllergies] = useState<any[]>([]);
  const [visits, setVisits] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState<'records' | 'visits' | 'emergency'>('records');
  const [showModal, setShowModal] = useState('');
  const [editRec, setEditRec] = useState<any>(null);

  const [recForm, setRecForm] = useState({ student_id: 0, blood_group: '', genotype: '', height_cm: '', weight_kg: '', vision_left: '', vision_right: '', chronic_conditions: '', allergies_text: '', current_medications: '', disability_notes: '' });
  const [visitForm, setVisitForm] = useState({ student_id: 0, complaint: '', diagnosis: '', treatment: '', medication_given: '', temperature: '', blood_pressure: '', referred_to: '', attended_by: '', notes: '', sms_parent: true });
  const [allergyForm, setAllergyForm] = useState({ student_id: 0, allergen: '', severity: 'mild', reaction: '', management_plan: '' });
  const [contactForm, setContactForm] = useState({ student_id: 0, contact_name: '', relationship: '', phone: '', alt_phone: '', email: '', is_primary: false, escalation_order: 1, can_authorize_treatment: false });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, r, a, v, c] = await Promise.all([
      supabase.from('school_students').select('id,first_name,last_name,admission_number,form_id,status').eq('status', 'Active').order('last_name'),
      supabase.from('school_health_records').select('*'),
      supabase.from('school_health_allergies').select('*'),
      supabase.from('school_clinic_visits').select('*').order('visit_date', { ascending: false }),
      supabase.from('school_emergency_contacts').select('*').order('escalation_order'),
    ]);
    setStudents(s.data || []); setRecords(r.data || []); setAllergies(a.data || []);
    setVisits(v.data || []); setContacts(c.data || []); setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getRec = (sid: number) => records.find(r => r.student_id === sid);
  const severeAllergies = allergies.filter(a => a.severity === 'severe' || a.severity === 'life_threatening');
  const now = new Date();
  const thisMonthVisits = visits.filter(v => { const d = new Date(v.visit_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });

  const openRecordModal = (sid: number) => {
    const rec = getRec(sid);
    setEditRec(rec || null);
    setRecForm({ student_id: sid, blood_group: rec?.blood_group || '', genotype: rec?.genotype || '', height_cm: rec?.height_cm || '', weight_kg: rec?.weight_kg || '', vision_left: rec?.vision_left || '', vision_right: rec?.vision_right || '', chronic_conditions: rec?.chronic_conditions || '', allergies_text: rec?.allergies || '', current_medications: rec?.current_medications || '', disability_notes: rec?.disability_notes || '' });
    setShowModal('record');
  };

  const saveRecord = async () => {
    if (!recForm.student_id) return toast.error('Select a student');
    setSaving(true);
    try {
      const p: any = { student_id: recForm.student_id, blood_group: recForm.blood_group || null, genotype: recForm.genotype || null, height_cm: recForm.height_cm ? Number(recForm.height_cm) : null, weight_kg: recForm.weight_kg ? Number(recForm.weight_kg) : null, vision_left: recForm.vision_left || null, vision_right: recForm.vision_right || null, chronic_conditions: recForm.chronic_conditions || null, allergies: recForm.allergies_text || null, current_medications: recForm.current_medications || null, disability_notes: recForm.disability_notes || null };
      let err;
      if (editRec?.id) ({ error: err } = await supabase.from('school_health_records').update(p).eq('id', editRec.id));
      else ({ error: err } = await supabase.from('school_health_records').insert([p]));
      if (err) throw err;
      toast.success('✅ Health record saved!'); setShowModal(''); fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const saveVisit = async () => {
    if (!visitForm.student_id || !visitForm.complaint.trim()) return toast.error('Student & complaint required');
    setSaving(true);
    try {
      const { error } = await supabase.from('school_clinic_visits').insert([{
        student_id: visitForm.student_id, complaint: visitForm.complaint.trim(),
        diagnosis: visitForm.diagnosis.trim() || null, treatment: visitForm.treatment.trim() || null,
        medication_given: visitForm.medication_given.trim() || null,
        temperature: visitForm.temperature ? Number(visitForm.temperature) : null,
        blood_pressure: visitForm.blood_pressure.trim() || null,
        referred_to: visitForm.referred_to.trim() || null,
        attended_by: visitForm.attended_by.trim() || null,
        notes: visitForm.notes.trim() || null,
      }]);
      if (error) throw error;
      // SMS notification
      if (visitForm.sms_parent) {
        const student = students.find(s => s.id === visitForm.student_id);
        const contact = contacts.find((c: any) => c.student_id === visitForm.student_id && c.is_primary);
        if (contact?.phone && student) {
          try {
            await fetch('/api/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: contact.phone,
                message: `APSIMS Health Alert: ${student.first_name} ${student.last_name} visited the school clinic. Complaint: ${visitForm.complaint}. ${visitForm.diagnosis ? 'Diagnosis: ' + visitForm.diagnosis + '. ' : ''}${visitForm.referred_to ? 'REFERRED to ' + visitForm.referred_to + '. ' : ''}Please contact the school for more details.`,
              }),
            });
            toast.success('📱 Parent notified via SMS');
          } catch { toast.error('SMS notification failed'); }
        }
      }
      toast.success('✅ Visit recorded!'); setShowModal(''); fetchAll();
    } catch (e: any) { toast.error(e.message); }
    setSaving(false);
  };

  const saveAllergy = async () => {
    if (!allergyForm.student_id || !allergyForm.allergen.trim()) return toast.error('Student & allergen required');
    setSaving(true);
    const { error } = await supabase.from('school_health_allergies').insert([{ student_id: allergyForm.student_id, allergen: allergyForm.allergen.trim(), severity: allergyForm.severity, reaction: allergyForm.reaction.trim() || null, management_plan: allergyForm.management_plan.trim() || null }]);
    if (error) toast.error(error.message);
    else { toast.success('✅ Allergy added!'); setShowModal(''); fetchAll(); }
    setSaving(false);
  };

  const saveContact = async () => {
    if (!contactForm.student_id || !contactForm.contact_name.trim() || !contactForm.phone.trim()) return toast.error('Student, name & phone required');
    setSaving(true);
    const { error } = await supabase.from('school_emergency_contacts').insert([{ student_id: contactForm.student_id, contact_name: contactForm.contact_name.trim(), relationship: contactForm.relationship.trim() || null, phone: contactForm.phone.trim(), alt_phone: contactForm.alt_phone.trim() || null, email: contactForm.email.trim() || null, is_primary: contactForm.is_primary, escalation_order: contactForm.escalation_order, can_authorize_treatment: contactForm.can_authorize_treatment }]);
    if (error) toast.error(error.message);
    else { toast.success('✅ Contact added!'); setShowModal(''); fetchAll(); }
    setSaving(false);
  };

  const delVisit = async (id: number) => { if (!confirm('Delete this visit?')) return; const { error } = await supabase.from('school_clinic_visits').delete().eq('id', id); if (!error) { toast.success('Deleted'); fetchAll(); } };
  const delAllergy = async (id: number) => { if (!confirm('Delete?')) return; const { error } = await supabase.from('school_health_allergies').delete().eq('id', id); if (!error) { toast.success('Deleted'); fetchAll(); } };
  const delContact = async (id: number) => { if (!confirm('Delete?')) return; const { error } = await supabase.from('school_emergency_contacts').delete().eq('id', id); if (!error) { toast.success('Deleted'); fetchAll(); } };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg" style={{ background: 'linear-gradient(135deg,#0f766e,#0891b2)' }}>🏥</div>
      <div className="w-8 h-8 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
      <p className="text-sm font-bold text-gray-500">Loading Health Center…</p>
    </div>
  );

  const kpis = [
    { l: 'Health Records', v: records.length, e: '📋', c: '#0f766e', bg: 'from-teal-50 to-emerald-50' },
    { l: 'Severe Allergies', v: severeAllergies.length, e: '⚠️', c: '#f59e0b', bg: 'from-amber-50 to-yellow-50' },
    { l: 'Clinic Visits', v: visits.length, e: '🩺', c: '#059669', bg: 'from-emerald-50 to-green-50' },
    { l: 'This Month', v: thisMonthVisits.length, e: '📅', c: '#2563eb', bg: 'from-blue-50 to-indigo-50' },
    { l: 'Emergency Contacts', v: contacts.length, e: '🆘', c: '#7c3aed', bg: 'from-purple-50 to-violet-50' },
  ];

  const tabs = [
    { k: 'records', l: '📋 Health Records', count: records.length },
    { k: 'visits', l: '🩺 Clinic Visits', count: visits.length },
    { k: 'emergency', l: '🆘 Emergency', count: contacts.length },
  ];

  return (
    <div className="animate-fadeIn space-y-5">
      {/* HEADER */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.03em' }}>
            🏥 Student Health Center
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {records.length} records · {visits.length} visits · {allergies.length} allergies · {contacts.length} contacts
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-teal-600 hover:border-teal-300 transition-all hover:shadow-sm"><FiRefreshCw size={15} /></button>
          <button onClick={() => { setShowModal('visit'); setVisitForm({ student_id: 0, complaint: '', diagnosis: '', treatment: '', medication_given: '', temperature: '', blood_pressure: '', referred_to: '', attended_by: '', notes: '', sms_parent: true }); }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg,#ecfdf5,#d1fae5)', color: '#065f46', border: 'none', cursor: 'pointer' }}>🩺 Clinic Visit</button>
          <button onClick={() => { setShowModal('allergy'); setAllergyForm({ student_id: 0, allergen: '', severity: 'mild', reaction: '', management_plan: '' }); }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)', color: '#92400e', border: 'none', cursor: 'pointer' }}>⚠️ Allergy</button>
          <button onClick={() => { setShowModal('contact'); setContactForm({ student_id: 0, contact_name: '', relationship: '', phone: '', alt_phone: '', email: '', is_primary: false, escalation_order: 1, can_authorize_treatment: false }); }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.98]" style={{ background: 'linear-gradient(135deg,#eff6ff,#dbeafe)', color: '#1e40af', border: 'none', cursor: 'pointer' }}>🆘 Emergency</button>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {kpis.map((cd, i) => (
          <div key={i} className={`bg-gradient-to-br ${cd.bg} rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group cursor-default`} style={{ borderLeftWidth: 4, borderLeftColor: cd.c }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">{cd.l}</p>
              <span className="text-xl group-hover:scale-110 transition-transform">{cd.e}</span>
            </div>
            <p className="text-2xl font-extrabold" style={{ color: cd.c }}>{cd.v}</p>
            <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.08]" style={{ background: cd.c }} />
          </div>
        ))}
      </div>

      {/* TABS */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${tab === t.k ? 'bg-white shadow-sm text-teal-700' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.l}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${tab === t.k ? 'bg-teal-50 text-teal-700' : 'bg-gray-200 text-gray-500'}`}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {tab === 'records' && <RecordsTab students={students} records={records} allergies={allergies} contacts={contacts} search={search} setSearch={setSearch} page={page} setPage={setPage} openRecordModal={openRecordModal} />}
      {tab === 'visits' && <VisitsTab visits={visits} students={students} allergies={allergies} onDelete={delVisit} />}
      {tab === 'emergency' && <EmergencyTab contacts={contacts} students={students} onDelete={delContact} />}

      {/* MODALS */}
      <RecordModal show={showModal === 'record'} saving={saving} onClose={() => setShowModal('')} onSave={saveRecord} form={recForm} setForm={setRecForm} students={students} />
      <VisitModal show={showModal === 'visit'} saving={saving} onClose={() => setShowModal('')} onSave={saveVisit} form={visitForm} setForm={setVisitForm} students={students} />
      <AllergyModal show={showModal === 'allergy'} saving={saving} onClose={() => setShowModal('')} onSave={saveAllergy} form={allergyForm} setForm={setAllergyForm} students={students} />
      <ContactModal show={showModal === 'contact'} saving={saving} onClose={() => setShowModal('')} onSave={saveContact} form={contactForm} setForm={setContactForm} students={students} />
    </div>
  );
}

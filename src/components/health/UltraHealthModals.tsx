'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  FiX,
  FiActivity,
  FiAlertTriangle,
  FiHeart,
  FiPhone,
  FiUserCheck,
  FiCheck,
  FiCalendar,
  FiShield,
  FiThermometer,
  FiPlus,
} from 'react-icons/fi';
import { supabase } from '@/lib/supabase';

const COMMON_COMPLAINTS = [
  'Headache & Migraine',
  'High Fever / Chills',
  'Abdominal Cramps',
  'Sports Injury / Sprain',
  'Asthma / Shortness of Breath',
  'Nausea & Vomiting',
  'Dysmenorrhea (Menstrual Pain)',
  'Eye Infection / Irritation',
  'Allergic Reaction / Hives',
  'Cut / Laceration',
];

const KENYA_HOSPITALS = [
  'Kenyatta National Hospital',
  'The Nairobi Hospital',
  'Aga Khan University Hospital',
  'Gertrude\'s Children\'s Hospital',
  'Tenwek Mission Hospital',
  'Kericho County Referral Hospital',
  'St. Mary\'s Mission Hospital',
  'Avenue Hospital',
  'MP Shah Hospital',
  'Local Sub-County Hospital & Health Centre',
];

/* ─────────────────────────────────────────────────────────────────
   1. ULTRA CLINIC VISIT MODAL
────────────────────────────────────────────────────────────────── */
export function UltraClinicVisitModal({
  isOpen,
  onClose,
  onSuccess,
  students,
  initialStudentId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: any[];
  initialStudentId?: number;
}) {
  const [studentId, setStudentId] = useState<number>(initialStudentId || 0);
  const [studentSearch, setStudentSearch] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [complaint, setComplaint] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatment, setTreatment] = useState('');
  const [medication, setMedication] = useState('');
  const [temperature, setTemperature] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [attendedBy, setAttendedBy] = useState('Nurse in Charge (RN)');
  const [disposition, setDisposition] = useState<'treated' | 'observed' | 'referred'>('treated');
  const [referredTo, setReferredTo] = useState('');
  const [notes, setNotes] = useState('');
  const [smsParent, setSmsParent] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialStudentId) setStudentId(initialStudentId);
  }, [initialStudentId]);

  if (!isOpen) return null;

  const filteredStudents = studentSearch.trim()
    ? students.filter((s) =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''}`
          .toLowerCase()
          .includes(studentSearch.toLowerCase())
      )
    : students.slice(0, 50);

  const selectedStudent = students.find((s) => s.id === studentId);

  const handleSave = async () => {
    if (!studentId) {
      toast.error('Please select a student.');
      return;
    }
    if (!complaint.trim()) {
      toast.error('Please enter the chief complaint.');
      return;
    }

    setSaving(true);
    try {
      const isReferred = disposition === 'referred';
      const isDischarged = disposition === 'treated';
      const tempNum = temperature ? Math.round(Number(temperature)) : null;

      const { data, error } = await supabase
        .from('school_clinic_visits')
        .insert([
          {
            student_id: studentId,
            visit_date: visitDate,
            complaint: complaint.trim(),
            diagnosis: diagnosis.trim() || null,
            treatment: treatment.trim() || null,
            medication_given: medication.trim() || null,
            temperature: tempNum,
            blood_pressure: bloodPressure.trim() || null,
            referred_to: isReferred ? referredTo.trim() || 'County Referral Hospital' : null,
            discharged: isDischarged,
            discharge_time: isDischarged ? new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : null,
            attended_by: attendedBy.trim() || null,
            notes: notes.trim() || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Dispatch Parent SMS Alert if opted
      if (smsParent && selectedStudent) {
        try {
          const { data: contact } = await supabase
            .from('school_emergency_contacts')
            .select('phone')
            .eq('student_id', studentId)
            .limit(1)
            .maybeSingle();

          const targetPhone = contact?.phone || selectedStudent.guardian_phone;
          if (targetPhone) {
            await fetch('/api/send-sms', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                phone: targetPhone,
                message: `APSIMS Health Alert: ${selectedStudent.first_name} visited the school clinic today (${visitDate}). Complaint: ${complaint.trim()}. ${
                  diagnosis ? `Diagnosis: ${diagnosis.trim()}. ` : ''
                }${isReferred ? `REFERRED TO: ${referredTo || 'Hospital'}. ` : 'Treated & resting.'}`,
              }),
            });
          }
        } catch {}
      }

      toast.success('✓ Clinical encounter recorded successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Error recording visit: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-4">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-emerald-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg shadow-sm">
              🩺
            </div>
            <div>
              <h3 className="text-base font-black text-emerald-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                Record Outpatient Clinic Encounter
              </h3>
              <p className="text-xs text-emerald-700">Clinical consultation, triage vitals &amp; treatment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          
          {/* Student Selector */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Select Patient / Student *
            </label>
            {!selectedStudent ? (
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search student by name or admission number..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
                />
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                  {filteredStudents.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStudentId(s.id)}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50 hover:text-emerald-900 transition flex items-center justify-between"
                    >
                      <span className="font-bold">{s.last_name}, {s.first_name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{s.admission_number}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🧑</span>
                  <div>
                    <strong className="text-emerald-950 text-xs">{selectedStudent.last_name}, {selectedStudent.first_name}</strong>
                    <span className="text-[10px] font-mono text-emerald-700 ml-2">Adm: {selectedStudent.admission_number}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStudentId(0)}
                  className="text-[10px] text-emerald-800 underline font-bold"
                >
                  Change Patient
                </button>
              </div>
            )}
          </div>

          {/* Date & Attending Clinician */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Visit Date *</label>
              <input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Attending Clinician / Nurse</label>
              <input
                type="text"
                value={attendedBy}
                onChange={(e) => setAttendedBy(e.target.value)}
                placeholder="e.g. Nurse Loice (RN)"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Vitals Triage Strip */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              Clinical Vitals Triage
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Temperature (°C)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                    placeholder="e.g. 37.2"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                  {Number(temperature) >= 38 && (
                    <span className="absolute right-2.5 top-2 text-[10px] font-bold text-rose-600">🔥 High Fever</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Blood Pressure (mmHg)</label>
                <input
                  type="text"
                  value={bloodPressure}
                  onChange={(e) => setBloodPressure(e.target.value)}
                  placeholder="e.g. 120/80"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Chief Complaint & Presets */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Chief Complaint &amp; Symptoms *
            </label>
            <textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              rows={2}
              placeholder="Describe presenting symptoms, onset and severity..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
            />
            {/* Quick chips */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_COMPLAINTS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setComplaint((prev) => (prev ? `${prev}, ${c}` : c))}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-medium transition"
                >
                  + {c}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnosis & Treatment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Clinical Diagnosis</label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Suspected Malaria / Acute Tonsillitis"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Treatment / Care Given</label>
              <input
                type="text"
                value={treatment}
                onChange={(e) => setTreatment(e.target.value)}
                placeholder="e.g. Bed rest, Oral rehydration"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Medications Dispensed */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Medications Dispensed (Drug, Dose, Frequency)
            </label>
            <input
              type="text"
              value={medication}
              onChange={(e) => setMedication(e.target.value)}
              placeholder="e.g. Paracetamol 500mg 1x3 (2 days), ORS sachet"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Disposition & Referral */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 block">
              Patient Clinical Disposition
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'treated', label: '✓ Treated & Discharged', icon: '🟢' },
                { id: 'observed', label: '🏥 Keep in Sick Bay', icon: '🟡' },
                { id: 'referred', label: '🚑 Hospital Referral', icon: '🔴' },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDisposition(d.id as any)}
                  className={`py-2 px-2.5 rounded-xl text-[11px] font-bold border transition text-center ${
                    disposition === d.id
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{d.icon} </span>
                  <span>{d.label}</span>
                </button>
              ))}
            </div>

            {/* If Referral */}
            {disposition === 'referred' && (
              <div className="pt-2 space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-rose-700">
                  Select Receiving Hospital *
                </label>
                <select
                  value={referredTo}
                  onChange={(e) => setReferredTo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-rose-300 text-xs font-bold text-slate-800 bg-white"
                >
                  <option value="">— Select Hospital —</option>
                  {KENYA_HOSPITALS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* SMS Notification Checkbox */}
          <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={smsParent}
              onChange={(e) => setSmsParent(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-[11px] font-medium text-slate-700">
              📱 Dispatch automated health alert SMS to student guardian
            </span>
          </label>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !studentId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 disabled:opacity-50 transition active:scale-95"
          >
            <FiCheck size={14} />
            <span>{saving ? 'Recording...' : 'Save Clinical Encounter'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   2. ULTRA STUDENT EHR BASELINE MODAL
────────────────────────────────────────────────────────────────── */
export function UltraStudentEhrModal({
  isOpen,
  onClose,
  onSuccess,
  students,
  existingRecord,
  selectedStudentId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: any[];
  existingRecord?: any;
  selectedStudentId?: number;
}) {
  const [studentId, setStudentId] = useState(selectedStudentId || 0);
  const [bloodGroup, setBloodGroup] = useState('');
  const [genotype, setGenotype] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [visionLeft, setVisionLeft] = useState('6/6');
  const [visionRight, setVisionRight] = useState('6/6');
  const [chronic, setChronic] = useState('');
  const [meds, setMeds] = useState('');
  const [disability, setDisability] = useState('');
  const [immunization, setImmunization] = useState('Fully Vaccinated / KEPI Compliant');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingRecord) {
      setStudentId(existingRecord.student_id);
      setBloodGroup(existingRecord.blood_group || '');
      setGenotype(existingRecord.genotype || '');
      setHeightCm(existingRecord.height_cm ? String(existingRecord.height_cm) : '');
      setWeightKg(existingRecord.weight_kg ? String(existingRecord.weight_kg) : '');
      setVisionLeft(existingRecord.vision_left || '6/6');
      setVisionRight(existingRecord.vision_right || '6/6');
      setChronic(existingRecord.chronic_conditions || '');
      setMeds(existingRecord.current_medications || '');
      setDisability(existingRecord.disability_notes || '');
      setImmunization(existingRecord.immunization_status || 'Fully Vaccinated / KEPI Compliant');
    } else if (selectedStudentId) {
      setStudentId(selectedStudentId);
    }
  }, [existingRecord, selectedStudentId]);

  if (!isOpen) return null;

  const currentStudent = students.find((s) => s.id === studentId);

  // Live BMI calculation
  const hM = Number(heightCm) / 100;
  const wK = Number(weightKg);
  const bmi = hM > 0 && wK > 0 ? (wK / (hM * hM)).toFixed(1) : null;
  const bmiCategory = bmi
    ? Number(bmi) < 18.5
      ? { label: 'Underweight', color: 'text-amber-700 bg-amber-50' }
      : Number(bmi) <= 24.9
      ? { label: 'Normal / Healthy Weight', color: 'text-emerald-700 bg-emerald-50' }
      : { label: 'Overweight', color: 'text-rose-700 bg-rose-50' }
    : null;

  const handleSave = async () => {
    if (!studentId) {
      toast.error('Select a student');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        student_id: studentId,
        blood_group: bloodGroup || null,
        genotype: genotype || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        vision_left: visionLeft || null,
        vision_right: visionRight || null,
        chronic_conditions: chronic.trim() || null,
        current_medications: meds.trim() || null,
        disability_notes: disability.trim() || null,
        immunization_status: immunization || null,
        updated_at: new Date().toISOString(),
      };

      if (existingRecord?.id) {
        const { error } = await supabase
          .from('school_health_records')
          .update(payload)
          .eq('id', existingRecord.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('school_health_records').insert([payload]);
        if (error) throw error;
      }

      toast.success('✓ Student Health Baseline (EHR) saved successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Error saving record: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden border border-slate-200 my-4">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-blue-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm">
              📋
            </div>
            <div>
              <h3 className="text-base font-black text-blue-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                {existingRecord ? 'Edit Student Health Profile (EHR)' : 'New Student Health Record'}
              </h3>
              <p className="text-xs text-blue-700">
                {currentStudent ? `${currentStudent.last_name}, ${currentStudent.first_name}` : 'Baseline health credentials'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition">
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {!existingRecord && !selectedStudentId && (
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Select Student *</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value={0}>— Select Student —</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name} ({s.admission_number})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Blood & Genotype */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="">— Select —</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Genotype</label>
              <select
                value={genotype}
                onChange={(e) => setGenotype(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
              >
                <option value="">— Select —</option>
                {['AA', 'AS', 'SS', 'AC'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Vitals Baseline & BMI */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Growth Vitals &amp; BMI</span>
              {bmiCategory && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${bmiCategory.color}`}>
                  BMI: {bmi} ({bmiCategory.label})
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g. 165"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g. 54"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Vision Screening */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Vision (Left Eye)</label>
              <select value={visionLeft} onChange={(e) => setVisionLeft(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs">
                {['6/6 (Normal)', '6/9', '6/12', '6/18', 'Corrected with Spectacles'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Vision (Right Eye)</label>
              <select value={visionRight} onChange={(e) => setVisionRight(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs">
                {['6/6 (Normal)', '6/9', '6/12', '6/18', 'Corrected with Spectacles'].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chronic Illnesses & Daily Meds */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Chronic Illnesses / Conditions
            </label>
            <input
              type="text"
              value={chronic}
              onChange={(e) => setChronic(e.target.value)}
              placeholder="e.g. Asthma, Type 1 Diabetes, Epilepsy (or None)"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Current Daily Medications
            </label>
            <input
              type="text"
              value={meds}
              onChange={(e) => setMeds(e.target.value)}
              placeholder="e.g. Salbutamol Inhaler 100mcg PRN"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          {/* Immunization & Special Needs */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Immunization Status</label>
            <input
              type="text"
              value={immunization}
              onChange={(e) => setImmunization(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !studentId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 disabled:opacity-50 transition active:scale-95"
          >
            <FiCheck size={14} />
            <span>{saving ? 'Saving...' : 'Save Health Baseline'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   3. ULTRA ALLERGY MODAL (Using exact columns: allergy_type, severity, description, treatment)
────────────────────────────────────────────────────────────────── */
export function UltraAllergyModal({
  isOpen,
  onClose,
  onSuccess,
  students,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: any[];
}) {
  const [studentId, setStudentId] = useState(0);
  const [allergyType, setAllergyType] = useState('');
  const [severity, setSeverity] = useState('Severe');
  const [description, setDescription] = useState('');
  const [treatment, setTreatment] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!studentId || !allergyType.trim()) {
      toast.error('Student and allergen name are required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('school_health_allergies').insert([
        {
          student_id: studentId,
          allergy_type: allergyType.trim(),
          severity,
          description: description.trim() || null,
          treatment: treatment.trim() || null,
        },
      ]);
      if (error) throw error;
      toast.success('✓ Allergy alert recorded in critical safety watch!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Error saving allergy: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 my-4">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-amber-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚠️</span>
            <div>
              <h3 className="text-base font-black text-amber-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                Add Critical Allergy Alert
              </h3>
              <p className="text-xs text-amber-800">Critical safety register for dining &amp; clinic</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Student *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            >
              <option value={0}>— Select Student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Allergen / Trigger *
            </label>
            <input
              type="text"
              value={allergyType}
              onChange={(e) => setAllergyType(e.target.value)}
              placeholder="e.g. Peanuts, Penicillin, Bee Sting, Latex"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Severity Rating</label>
            <div className="grid grid-cols-3 gap-2">
              {['Mild', 'Moderate', 'Severe'].map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition text-center ${
                    severity === sev
                      ? sev === 'Severe'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Reaction Description (Symptoms)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Facial swelling, throat tightness, hives"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">
              Emergency Action Protocol
            </label>
            <textarea
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              rows={2}
              placeholder="e.g. Administer EpiPen immediately, call ambulance and guardian"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !studentId || !allergyType.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-500/20 disabled:opacity-50 transition active:scale-95"
          >
            {saving ? 'Saving...' : 'Add Allergy Alert'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   4. ULTRA EMERGENCY CONTACT MODAL (Using exact columns: contact_name, relationship, phone, phone2, email, is_primary)
────────────────────────────────────────────────────────────────── */
export function UltraEmergencyContactModal({
  isOpen,
  onClose,
  onSuccess,
  students,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  students: any[];
}) {
  const [studentId, setStudentId] = useState(0);
  const [contactName, setContactName] = useState('');
  const [relationship, setRelationship] = useState('Parent');
  const [phone, setPhone] = useState('');
  const [phone2, setPhone2] = useState('');
  const [email, setEmail] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!studentId || !contactName.trim() || !phone.trim()) {
      toast.error('Student, contact name, and primary phone are required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('school_emergency_contacts').insert([
        {
          student_id: studentId,
          contact_name: contactName.trim(),
          relationship: relationship.trim() || null,
          phone: phone.trim(),
          phone2: phone2.trim() || null,
          email: email.trim() || null,
          is_primary: isPrimary,
        },
      ]);
      if (error) throw error;
      toast.success('✓ Emergency contact added successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(`Error saving contact: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 my-4">
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-purple-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🆘</span>
            <div>
              <h3 className="text-base font-black text-purple-950 tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>
                Add Emergency Contact
              </h3>
              <p className="text-xs text-purple-800">Direct hospital authorization &amp; parent alerts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700">
            <FiX size={18} />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-3 text-xs">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Student *</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold"
            >
              <option value={0}>— Select Student —</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.last_name}, {s.first_name} ({s.admission_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Contact Name *</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="e.g. Mary Wanjiru Mwangi"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Relationship</label>
              <select
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
              >
                {['Parent', 'Mother', 'Father', 'Guardian', 'Uncle', 'Aunt', 'Family Doctor'].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Primary Contact?</label>
              <button
                type="button"
                onClick={() => setIsPrimary((p) => !p)}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition ${
                  isPrimary ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {isPrimary ? '⭐ Primary' : 'Secondary'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Primary Phone *</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Alternative Phone</label>
              <input
                type="tel"
                value={phone2}
                onChange={(e) => setPhone2(e.target.value)}
                placeholder="Optional second line"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-600 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@example.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !studentId || !contactName.trim() || !phone.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-black bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20 disabled:opacity-50 transition active:scale-95"
          >
            {saving ? 'Saving...' : 'Save Emergency Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

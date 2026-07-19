'use client';
import { useState } from 'react';
import { FiX, FiSave, FiSearch, FiMessageSquare, FiAlertTriangle, FiThermometer, FiHeart, FiActivity } from 'react-icons/fi';

/* ═══════════════ DESIGN TOKENS ═══════════════ */
const G = {
  red: 'linear-gradient(135deg,#ef4444,#dc2626)',
  green: 'linear-gradient(135deg,#059669,#0d9488)',
  teal: 'linear-gradient(135deg,#0f766e,#0891b2)',
  amber: 'linear-gradient(135deg,#f59e0b,#d97706)',
  blue: 'linear-gradient(135deg,#2563eb,#3b82f6)',
  purple: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
};

/* ═══════════════ SHARED HELPERS ═══════════════ */
const Overlay = ({ children, onClose }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
    <div className="relative" onClick={(e: any) => e.stopPropagation()}>{children}</div>
  </div>
);

const Header = ({ grad, icon, title, subtitle, onClose }: any) => (
  <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{ background: grad }}>
    <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10 bg-white" />
    <div className="absolute -left-4 -bottom-4 w-24 h-24 rounded-full opacity-[0.07] bg-white" />
    <div className="flex items-center gap-3 relative z-10">
      <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl shadow-lg">{icon}</div>
      <div><h2 className="text-lg font-extrabold text-white tracking-tight" style={{ fontFamily: 'Outfit,sans-serif' }}>{title}</h2>
        {subtitle && <p className="text-xs text-white/70 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    <button onClick={onClose} className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all relative z-10"><FiX size={18} /></button>
  </div>
);

const Footer = ({ onClose, onSave, saving, grad, label = 'Save' }: any) => (
  <div className="px-6 py-4 border-t border-gray-100 flex gap-3 justify-end bg-gradient-to-r from-gray-50 to-white">
    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-all flex items-center gap-2">
      <FiX size={14} /> Cancel
    </button>
    <button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]" style={{ background: grad }}>
      {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiSave size={14} />} {label}
    </button>
  </div>
);

const Label = ({ children, required }: any) => (
  <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">
    {children} {required && <span className="text-red-400">*</span>}
  </label>
);

const Input = ({ value, onChange, type = 'text', placeholder = '', ...rest }: any) => (
  <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" {...rest} />
);

const Textarea = ({ value, onChange, rows = 2, placeholder = '' }: any) => (
  <textarea value={value} onChange={(e: any) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all resize-none" />
);

const Select = ({ value, onChange, opts, placeholder = '— Select —' }: any) => (
  <select value={value} onChange={(e: any) => onChange(e.target.value)}
    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all">
    <option value="">{placeholder}</option>
    {opts.map((o: any) => <option key={o.v || o} value={o.v || o}>{o.l || o}</option>)}
  </select>
);

/* Student Search Picker */
const StudentPicker = ({ students, value, onChange }: any) => {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const sel = students.find((s: any) => s.id === value);
  const filtered = q.trim() ? students.filter((s: any) => `${s.last_name} ${s.first_name} ${s.admission_number || ''}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40) : [];
  return (
    <div className="relative">
      <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm cursor-pointer flex items-center justify-between hover:border-teal-400 transition-all" onClick={() => setOpen(!open)}>
        <span className={sel ? 'text-gray-900 font-semibold' : 'text-gray-400'}>
          {sel ? `${sel.last_name}, ${sel.first_name} (${sel.admission_number || '-'})` : '🔍 Search student…'}
        </span>
        <FiSearch size={14} className="text-gray-400" />
      </div>
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-2xl mt-1 overflow-hidden">
          <div className="p-2.5 border-b border-gray-100">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Type name or admission no…"
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-400" />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {!q.trim() && <div className="px-4 py-3 text-xs text-gray-400 text-center">Start typing to search {students.length} students</div>}
            {q.trim() && !filtered.length && <div className="px-4 py-3 text-xs text-gray-400 text-center">No students found</div>}
            {filtered.map((s: any) => (
              <div key={s.id} className={`px-4 py-2.5 cursor-pointer hover:bg-teal-50 text-sm transition-colors ${value === s.id ? 'bg-teal-50 font-bold text-teal-700' : ''}`}
                onClick={() => { onChange(s.id); setOpen(false); setQ(''); }}>
                <span className="font-semibold">{s.last_name}, {s.first_name}</span>
                <span className="text-gray-400 ml-2 text-xs">({s.admission_number || '-'})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════ SECTION DIVIDER ═══════════════ */
const Section = ({ icon, title, children }: any) => (
  <div>
    <div className="flex items-center gap-2 mb-3">
      <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600">{icon}</div>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</p>
    </div>
    {children}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   1. HEALTH RECORD MODAL
   ═══════════════════════════════════════════════════════════════ */
export function RecordModal({ show, saving, onClose, onSave, form, setForm, students }: any) {
  if (!show) return null;
  const s = setForm;
  const bmi = form.height_cm && form.weight_kg ? (Number(form.weight_kg) / Math.pow(Number(form.height_cm) / 100, 2)).toFixed(1) : null;
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[680px] max-h-[92vh] overflow-hidden flex flex-col" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <Header grad={G.red} icon="🩸" title="Health Record" subtitle="Medical profile & vital health data" onClose={onClose} />
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          <Section icon={<FiHeart size={12} />} title="Blood & Genetics">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Blood Group</Label><Select value={form.blood_group} onChange={(v: string) => s({ ...form, blood_group: v })} opts={[{ v: 'A+', l: 'A+' }, { v: 'A-', l: 'A-' }, { v: 'B+', l: 'B+' }, { v: 'B-', l: 'B-' }, { v: 'AB+', l: 'AB+' }, { v: 'AB-', l: 'AB-' }, { v: 'O+', l: 'O+' }, { v: 'O-', l: 'O-' }]} /></div>
              <div><Label>Genotype</Label><Select value={form.genotype} onChange={(v: string) => s({ ...form, genotype: v })} opts={['AA', 'AS', 'SS', 'AC', 'SC', 'CC']} /></div>
            </div>
          </Section>
          <Section icon={<FiActivity size={12} />} title="Body Measurements">
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Height (cm)</Label><Input value={form.height_cm} onChange={(v: string) => s({ ...form, height_cm: v })} type="number" placeholder="165" /></div>
              <div><Label>Weight (kg)</Label><Input value={form.weight_kg} onChange={(v: string) => s({ ...form, weight_kg: v })} type="number" placeholder="55" /></div>
              <div><Label>BMI</Label>
                <div className="w-full px-4 py-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl text-sm font-bold text-teal-700">
                  {bmi || '—'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div><Label>Vision (Left)</Label><Input value={form.vision_left} onChange={(v: string) => s({ ...form, vision_left: v })} placeholder="6/6" /></div>
              <div><Label>Vision (Right)</Label><Input value={form.vision_right} onChange={(v: string) => s({ ...form, vision_right: v })} placeholder="6/6" /></div>
            </div>
          </Section>
          <Section icon={<FiAlertTriangle size={12} />} title="Medical History">
            <div className="space-y-3">
              <div><Label>Chronic Conditions</Label><Textarea value={form.chronic_conditions} onChange={(v: string) => s({ ...form, chronic_conditions: v })} placeholder="e.g. Asthma, Epilepsy, Diabetes…" /></div>
              <div><Label>Known Allergies</Label><Textarea value={form.allergies_text} onChange={(v: string) => s({ ...form, allergies_text: v })} placeholder="e.g. Penicillin, Peanuts…" /></div>
              <div><Label>Current Medications</Label><Textarea value={form.current_medications} onChange={(v: string) => s({ ...form, current_medications: v })} placeholder="e.g. Ventolin inhaler PRN" /></div>
              <div><Label>Disability / Special Needs</Label><Textarea value={form.disability_notes} onChange={(v: string) => s({ ...form, disability_notes: v })} placeholder="Any physical or learning disabilities…" /></div>
            </div>
          </Section>
        </div>
        <Footer onClose={onClose} onSave={onSave} saving={saving} grad={G.red} label="Save Record" />
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════════════════════════
   2. ULTRA PREMIUM CLINIC VISIT MODAL (with SMS)
   ═══════════════════════════════════════════════════════════════ */
export function VisitModal({ show, saving, onClose, onSave, form, setForm, students }: any) {
  if (!show) return null;
  const s = setForm;
  const tempClass = form.temperature && Number(form.temperature) >= 38 ? 'border-red-300 bg-red-50 text-red-700' : '';
  const commonComplaints = ['Headache', 'Stomachache', 'Fever', 'Cough', 'Cold/Flu', 'Vomiting', 'Diarrhea', 'Injury/Wound', 'Skin Rash', 'Eye Pain', 'Ear Pain', 'Tooth Pain', 'Menstrual Pain', 'Dizziness', 'Allergic Reaction', 'Asthma Attack'];
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[740px] max-h-[94vh] overflow-hidden flex flex-col" style={{ animation: 'slideUp 0.3s ease-out' }}>

        {/* ── Premium Header ── */}
        <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 60%, #7c3aed 100%)' }}>
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full opacity-10 bg-white" />
          <div className="absolute -left-6 -bottom-6 w-32 h-32 rounded-full opacity-[0.07] bg-white" />
          <div className="absolute right-20 top-4 w-20 h-20 rounded-full opacity-[0.06] bg-white" />
          <div className="px-7 py-6 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center text-3xl shadow-xl border border-white/20">🏥</div>
              <div>
                <h2 className="text-xl font-extrabold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>New Clinic Visit</h2>
                <p className="text-sm text-white/70 mt-0.5 font-medium">Record sick bay visit & notify parent</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-[10px] font-bold text-white/90 border border-white/20">📅 {new Date(form.visit_date || Date.now()).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  {form.student_id > 0 && students.find((st: any) => st.id === form.student_id) && (
                    <span className="px-2.5 py-0.5 bg-white/15 rounded-full text-[10px] font-bold text-white/90 border border-white/20">
                      👤 {(() => { const st = students.find((st: any) => st.id === form.student_id); return st ? `${st.last_name}, ${st.first_name}` : ''; })()}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm text-white hover:bg-white/25 transition-all border border-white/15 hover:scale-105">
              <FiX size={20} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-gradient-to-b from-gray-50/50 to-white">

          {/* Row 1: Student + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label required>Student</Label>
              <StudentPicker students={students} value={form.student_id} onChange={(id: number) => s({ ...form, student_id: id })} />
            </div>
            <div>
              <Label required>Visit Date</Label>
              <div className="relative">
                <input
                  type="date"
                  value={form.visit_date || new Date().toISOString().split('T')[0]}
                  onChange={(e: any) => s({ ...form, visit_date: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-white border-2 border-teal-100 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-50 transition-all shadow-sm hover:border-teal-200"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-teal-500 text-base pointer-events-none">📅</span>
              </div>
            </div>
          </div>

          {/* Complaint */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-xl bg-teal-50 flex items-center justify-center text-sm">🗣️</span>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Complaint <span className="text-red-400">*</span></p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {commonComplaints.map(c => {
                const active = form.complaint?.includes(c);
                return (
                  <button key={c} type="button"
                    onClick={() => s({ ...form, complaint: active ? form.complaint.replace(`, ${c}`, '').replace(c, '').replace(/^,\s*/, '') : form.complaint ? `${form.complaint}, ${c}` : c })}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all hover:scale-105 active:scale-95 ${active ? 'bg-teal-600 text-white border-teal-600 shadow-md' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'}`}>
                    {active ? '✓ ' : ''}{c}
                  </button>
                );
              })}
            </div>
            <Textarea value={form.complaint} onChange={(v: string) => s({ ...form, complaint: v })} rows={2} placeholder="Describe complaint in detail…" />
          </div>

          {/* Diagnosis & Treatment */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center text-sm">🩺</span>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Clinical Assessment</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Diagnosis</Label><Input value={form.diagnosis} onChange={(v: string) => s({ ...form, diagnosis: v })} placeholder="Clinical diagnosis" /></div>
              <div><Label>Treatment</Label><Input value={form.treatment} onChange={(v: string) => s({ ...form, treatment: v })} placeholder="Treatment given" /></div>
            </div>
            <div><Label>Medication Given</Label><Input value={form.medication_given} onChange={(v: string) => s({ ...form, medication_given: v })} placeholder="e.g. Paracetamol 500mg, ORS…" /></div>
          </div>

          {/* Vitals */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-xl bg-red-50 flex items-center justify-center text-sm">❤️</span>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Vitals <span className="text-gray-400 font-normal normal-case">(Optional)</span></p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Temp (°C)</Label>
                <div className="relative">
                  <input type="number" step="0.1" value={form.temperature} onChange={(e: any) => s({ ...form, temperature: e.target.value })} placeholder="37.0"
                    className={`w-full px-4 py-3 border-2 rounded-xl text-sm font-bold focus:outline-none focus:ring-4 transition-all ${tempClass ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-50' : 'border-gray-100 bg-gray-50 focus:border-teal-400 focus:ring-teal-50'}`} />
                  {form.temperature && Number(form.temperature) >= 38 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse">🔥 FEVER</span>
                  )}
                </div>
              </div>
              <div><Label>Blood Pressure</Label><Input value={form.blood_pressure} onChange={(v: string) => s({ ...form, blood_pressure: v })} placeholder="120/80" /></div>
              <div><Label>Attended By</Label><Input value={form.attended_by} onChange={(v: string) => s({ ...form, attended_by: v })} placeholder="Nurse name" /></div>
            </div>
          </div>

          {/* Referral & Notes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-7 h-7 rounded-xl bg-amber-50 flex items-center justify-center text-sm">📋</span>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Additional Info</p>
            </div>
            <div><Label>Referred To (if applicable)</Label><Input value={form.referred_to} onChange={(v: string) => s({ ...form, referred_to: v })} placeholder="e.g. Kenyatta National Hospital, KEMRI…" /></div>
            <div><Label>Clinical Notes</Label><Textarea value={form.notes} onChange={(v: string) => s({ ...form, notes: v })} placeholder="Additional observations, follow-up instructions…" /></div>
          </div>

          {/* SMS Toggle */}
          <div className="relative overflow-hidden rounded-2xl border-2 border-blue-100" style={{ background: 'linear-gradient(135deg, #eff6ff, #eef2ff)' }}>
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-blue-100 opacity-40" />
            <div className="px-5 py-4 flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center shadow-sm border border-blue-200">
                  <FiMessageSquare size={20} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-extrabold text-blue-900">Notify Parent via SMS</p>
                  <p className="text-[11px] text-blue-500 font-medium mt-0.5">Auto-send clinic visit alert to parent/guardian</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={form.sms_parent || false} onChange={e => s({ ...form, sms_parent: e.target.checked })} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all" />
              </label>
            </div>
          </div>
        </div>
        <Footer onClose={onClose} onSave={onSave} saving={saving} grad={G.teal} label="Record Visit" />
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════════════════════════
   3. ALLERGY MODAL
   ═══════════════════════════════════════════════════════════════ */
export function AllergyModal({ show, saving, onClose, onSave, form, setForm, students }: any) {
  if (!show) return null;
  const s = setForm;
  const sevColors: any = { mild: 'bg-green-50 text-green-700 border-green-200', moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200', severe: 'bg-orange-50 text-orange-700 border-orange-200', life_threatening: 'bg-red-50 text-red-700 border-red-200' };
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[540px] max-h-[92vh] overflow-hidden flex flex-col" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <Header grad={G.amber} icon="⚠️" title="Add Allergy" subtitle="Track student allergens & severity" onClose={onClose} />
        <div className="p-6 space-y-4">
          <div><Label required>Student</Label><StudentPicker students={students} value={form.student_id} onChange={(id: number) => s({ ...form, student_id: id })} /></div>
          <div><Label required>Allergen</Label><Input value={form.allergen} onChange={(v: string) => s({ ...form, allergen: v })} placeholder="e.g. Penicillin, Peanuts, Dust" /></div>
          <div>
            <Label>Severity</Label>
            <div className="grid grid-cols-4 gap-2">
              {(['mild', 'moderate', 'severe', 'life_threatening'] as const).map(sev => (
                <button key={sev} type="button" onClick={() => s({ ...form, severity: sev })}
                  className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${form.severity === sev ? sevColors[sev] + ' ring-2 ring-offset-1 ring-amber-300 scale-105' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>
                  {sev === 'life_threatening' ? '☠️ Critical' : sev === 'severe' ? '🔴 Severe' : sev === 'moderate' ? '🟡 Moderate' : '🟢 Mild'}
                </button>
              ))}
            </div>
          </div>
          <div><Label>Reaction</Label><Input value={form.reaction} onChange={(v: string) => s({ ...form, reaction: v })} placeholder="e.g. Swelling, rash, anaphylaxis…" /></div>
          <div><Label>Management Plan</Label><Textarea value={form.management_plan} onChange={(v: string) => s({ ...form, management_plan: v })} placeholder="Emergency response steps…" /></div>
        </div>
        <Footer onClose={onClose} onSave={onSave} saving={saving} grad={G.amber} label="Save Allergy" />
      </div>
    </Overlay>
  );
}

/* ═══════════════════════════════════════════════════════════════
   4. EMERGENCY CONTACT MODAL
   ═══════════════════════════════════════════════════════════════ */
export function ContactModal({ show, saving, onClose, onSave, form, setForm, students }: any) {
  if (!show) return null;
  const s = setForm;
  return (
    <Overlay onClose={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[580px] max-h-[92vh] overflow-hidden flex flex-col" style={{ animation: 'slideUp 0.3s ease-out' }}>
        <Header grad={G.blue} icon="🆘" title="Emergency Contact" subtitle="Add parent/guardian for emergencies" onClose={onClose} />
        <div className="p-6 space-y-4">
          <div><Label required>Student</Label><StudentPicker students={students} value={form.student_id} onChange={(id: number) => s({ ...form, student_id: id })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label required>Contact Name</Label><Input value={form.contact_name} onChange={(v: string) => s({ ...form, contact_name: v })} placeholder="Full name" /></div>
            <div><Label>Relationship</Label><Select value={form.relationship} onChange={(v: string) => s({ ...form, relationship: v })} opts={['Father', 'Mother', 'Guardian', 'Uncle', 'Aunt', 'Sibling', 'Sponsor', 'Other']} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label required>Phone</Label><Input value={form.phone} onChange={(v: string) => s({ ...form, phone: v })} placeholder="0712 345 678" /></div>
            <div><Label>Alt Phone</Label><Input value={form.alt_phone} onChange={(v: string) => s({ ...form, alt_phone: v })} placeholder="Optional" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Escalation Order</Label><Input type="number" value={form.escalation_order} onChange={(v: string) => s({ ...form, escalation_order: Number(v) })} /></div>
            <div className="flex flex-col gap-3 pt-6">
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={form.is_primary} onChange={e => s({ ...form, is_primary: e.target.checked })} className="w-4.5 h-4.5 rounded-md accent-blue-600" />
                <span className="text-sm text-gray-700 group-hover:text-blue-700 transition">Primary Contact</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input type="checkbox" checked={form.can_authorize_treatment} onChange={e => s({ ...form, can_authorize_treatment: e.target.checked })} className="w-4.5 h-4.5 rounded-md accent-blue-600" />
                <span className="text-sm text-gray-700 group-hover:text-blue-700 transition">Can Authorize Treatment</span>
              </label>
            </div>
          </div>
        </div>
        <Footer onClose={onClose} onSave={onSave} saving={saving} grad={G.blue} label="Save Contact" />
      </div>
    </Overlay>
  );
}

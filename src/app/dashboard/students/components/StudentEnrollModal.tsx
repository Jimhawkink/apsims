'use client';

import { useState, useEffect, useRef } from 'react';
import { FiX, FiSave, FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getEducationSystem } from '@/lib/cbc-utils';
import EducationSystemBadge from '@/components/cbc/EducationSystemBadge';
import CBCEnrollmentStep from '@/components/cbc/CBCEnrollmentStep';
import { KENYAN_COUNTIES, COUNTY_NAMES, NATIONALITIES } from '@/lib/kenyan-data';

// ─────────────────────────────────────────────────────────────────
// WORLD-CLASS DATEPICKER COMPONENT
// ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

function calcAge(dob: string): number {
    const d = new Date(dob + 'T00:00:00'); const n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
    return a;
}

interface SmartDatePickerProps {
    value: string;                 // ISO YYYY-MM-DD
    onChange: (v: string) => void;
    label?: string;
    mode?: 'dob' | 'date';        // 'dob' shows age, restricts future; 'date' is free
    accentColor?: string;         // CSS gradient string
    placeholder?: string;
}

function SmartDatePicker({ value, onChange, mode = 'date', accentColor = 'linear-gradient(135deg,#3b82f6,#6366f1)', placeholder = 'Pick a date' }: SmartDatePickerProps) {
    const today    = new Date();
    const todayISO = today.toISOString().split('T')[0];

    const parsed   = value ? new Date(value + 'T00:00:00') : null;
    const initY    = parsed ? parsed.getFullYear() : (mode === 'dob' ? today.getFullYear() - 14 : today.getFullYear());
    const initM    = parsed ? parsed.getMonth() : today.getMonth();

    const [open, setOpen]   = useState(false);
    const [vy, setVy]       = useState(initY);
    const [vm, setVm]       = useState(initM);
    const wrapRef           = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, []);

    // Sync view when value changes externally
    useEffect(() => {
        if (value) { const d = new Date(value + 'T00:00:00'); setVy(d.getFullYear()); setVm(d.getMonth()); }
    }, [value]);

    const age       = (mode === 'dob' && value) ? calcAge(value) : null;
    const ageValid  = age !== null && age >= 10 && age <= 25;

    // Calendar grid
    const firstDay  = new Date(vy, vm, 1).getDay();
    const daysInMon = new Date(vy, vm + 1, 0).getDate();
    const cells: (number|null)[] = [...Array(firstDay).fill(null), ...Array.from({length:daysInMon},(_,i)=>i+1)];
    while (cells.length % 7 !== 0) cells.push(null);

    const pickDay = (day: number) => {
        const iso = `${vy}-${String(vm+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        onChange(iso); setOpen(false);
    };

    const isToday   = (day: number) => `${vy}-${String(vm+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` === todayISO;
    const isSelected= (day: number) => `${vy}-${String(vm+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` === value;
    const isFuture  = (day: number) => mode === 'dob' && new Date(vy, vm, day) > today;

    const prevMonth = () => { if (vm===0){setVm(11);setVy(y=>y-1);}else setVm(m=>m-1); };
    const nextMonth = () => { if (vm===11){setVm(0);setVy(y=>y+1);}else setVm(m=>m+1); };

    // Year range: dob = last 25 yrs; date = ±5 yrs from today
    const yearRange = mode === 'dob'
        ? Array.from({length:26},(_,i)=>today.getFullYear()-i)
        : Array.from({length:11},(_,i)=>today.getFullYear()-5+i);

    const displayVal = parsed
        ? parsed.toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'})
        : placeholder;

    return (
        <div ref={wrapRef} style={{position:'relative',width:'100%'}}>
            {/* ── TRIGGER BUTTON ── */}
            <button type="button" onClick={()=>setOpen(o=>!o)}
                style={{
                    width:'100%', display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    border:`2px solid ${open?'#3b82f6':value?'#93c5fd':'#e5e7eb'}`,
                    borderRadius:14, background: value?'#eff6ff':'#fff',
                    cursor:'pointer', transition:'all 0.2s',
                    boxShadow: open?'0 0 0 4px rgba(59,130,246,0.12)':'0 1px 3px rgba(0,0,0,0.06)',
                }}>
                <span style={{fontSize:15, color: value?'#3b82f6':'#9ca3af'}}>
                    <FiCalendar size={16}/>
                </span>
                <span style={{flex:1,textAlign:'left',fontSize:13,fontWeight:value?700:400,color:value?'#1e3a5f':'#9ca3af'}}>
                    {displayVal}
                </span>
                {age !== null && (
                    <span style={{fontSize:11,fontWeight:800,padding:'2px 9px',borderRadius:20,background:ageValid?'#dbeafe':'#fee2e2',color:ageValid?'#1d4ed8':'#dc2626'}}>
                        {age} yrs {ageValid?'✓':'✗'}
                    </span>
                )}
                <span style={{fontSize:9,color:'#9ca3af',transition:'transform 0.2s',transform:open?'rotate(180deg)':'rotate(0deg)'}}>▼</span>
            </button>

            {/* ── CALENDAR POPOVER ── */}
            {open && (
                <div style={{
                    position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:99999,
                    background:'#fff',borderRadius:20,
                    boxShadow:'0 25px 60px rgba(0,0,0,0.18),0 8px 24px rgba(0,0,0,0.10)',
                    border:'1px solid #e5e7eb',minWidth:310,overflow:'hidden',
                    animation:'dpSlideIn 0.16s cubic-bezier(0.34,1.56,0.64,1)',
                }}>
                    <style>{`
                        @keyframes dpSlideIn{from{opacity:0;transform:translateY(-8px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
                        .dp-cell:hover:not([disabled]){background:#3b82f6!important;color:#fff!important;transform:scale(1.1);box-shadow:0 4px 12px rgba(59,130,246,0.4)!important;}
                        .dp-cell{transition:all 0.12s cubic-bezier(0.34,1.56,0.64,1);}
                    `}</style>

                    {/* Header gradient */}
                    <div style={{background:accentColor,padding:'16px 18px'}}>
                        {/* Title row */}
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                                <FiCalendar size={14} color="rgba(255,255,255,0.85)"/>
                                <span style={{fontSize:11,fontWeight:800,color:'rgba(255,255,255,0.9)',letterSpacing:'0.1em',textTransform:'uppercase'}}>
                                    {mode==='dob'?'Date of Birth':'Select Date'}
                                </span>
                            </div>
                            {age !== null && (
                                <span style={{fontSize:11,fontWeight:900,color:ageValid?'#bbf7d0':'#fca5a5'}}>
                                    Age: {age} {ageValid?'✓ Valid':`✗ Must be 10-25`}
                                </span>
                            )}
                        </div>

                        {/* Month / Year selectors + arrows */}
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <button type="button" onClick={prevMonth}
                                style={{padding:'6px 8px',borderRadius:10,background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center'}}>
                                <FiChevronLeft size={14}/>
                            </button>

                            <select value={vm} onChange={e=>setVm(Number(e.target.value))}
                                style={{flex:2,padding:'7px 10px',borderRadius:10,border:'none',background:'rgba(255,255,255,0.18)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',outline:'none',appearance:'none',textAlign:'center'}}>
                                {MONTH_NAMES.map((m,i)=><option key={i} value={i} style={{background:'#3b82f6',color:'#fff'}}>{m}</option>)}
                            </select>

                            <select value={vy} onChange={e=>setVy(Number(e.target.value))}
                                style={{flex:1,padding:'7px 10px',borderRadius:10,border:'none',background:'rgba(255,255,255,0.18)',color:'#fff',fontWeight:800,fontSize:13,cursor:'pointer',outline:'none',appearance:'none',textAlign:'center'}}>
                                {yearRange.map(y=><option key={y} value={y} style={{background:'#3b82f6',color:'#fff'}}>{y}</option>)}
                            </select>

                            <button type="button" onClick={nextMonth}
                                style={{padding:'6px 8px',borderRadius:10,background:'rgba(255,255,255,0.2)',border:'none',color:'#fff',cursor:'pointer',display:'flex',alignItems:'center'}}>
                                <FiChevronRight size={14}/>
                            </button>
                        </div>
                    </div>

                    {/* Day grid */}
                    <div style={{padding:'14px 16px 18px'}}>
                        {/* Weekday headers */}
                        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:8}}>
                            {DAY_LABELS.map(d=>(
                                <div key={d} style={{textAlign:'center',fontSize:10,fontWeight:800,color:'#94a3b8',letterSpacing:'0.06em',padding:'3px 0'}}>{d}</div>
                            ))}
                        </div>

                        {/* Day cells */}
                        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3}}>
                            {cells.map((day,idx)=>{
                                if (!day) return <div key={idx}/>;
                                const sel  = isSelected(day);
                                const tod  = isToday(day);
                                const dis  = isFuture(day);
                                return (
                                    <button key={idx} type="button" className="dp-cell"
                                        disabled={dis}
                                        onClick={()=>!dis&&pickDay(day)}
                                        style={{
                                            width:'100%',aspectRatio:'1',borderRadius:11,border:'none',
                                            cursor:dis?'not-allowed':'pointer',
                                            fontSize:12,fontWeight:sel?900:tod?700:500,
                                            background:sel?'#3b82f6':tod?'#eff6ff':'transparent',
                                            color:sel?'#fff':dis?'#d1d5db':tod?'#3b82f6':'#1e293b',
                                            boxShadow:sel?'0 4px 12px rgba(59,130,246,0.5)':tod?'inset 0 0 0 2px #bfdbfe':'none',
                                            outline:tod&&!sel?'2px solid #93c5fd':'none',
                                        }}>
                                        {day}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Footer hint */}
                        <p style={{margin:'12px 0 0',fontSize:10,color:'#94a3b8',textAlign:'center',fontStyle:'italic'}}>
                            {mode==='dob'?'Student DOB · Valid age 10–25 years · Future dates disabled':'Click any date to select'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}


interface EnrollModalProps {
    showModal: boolean;
    editId: number | null;
    formData: any;
    setFormData: (v: any) => void;
    modalTab: number;
    setModalTab: (v: number) => void;
    forms: any[];
    streams: any[];
    isCBCForm: boolean;
    cbcPathways: any[];
    cbcPathwaySubjects: any[];
    allSubjects: any[];
    selectedPathwayId: number | null;
    selectedElectives: number[];
    onPathwayChange: (id: number | null) => void;
    onElectivesChange: (ids: number[]) => void;
    onClose: () => void;
    onSave: () => void;
}

export default function StudentEnrollModal({
    showModal, editId, formData, setFormData,
    modalTab, setModalTab, forms, streams, isCBCForm,
    cbcPathways, cbcPathwaySubjects, allSubjects,
    selectedPathwayId, selectedElectives,
    onPathwayChange, onElectivesChange,
    onClose, onSave,
}: EnrollModalProps) {
    if (!showModal) return null;

    const subCounties = formData.county ? KENYAN_COUNTIES[formData.county] || [] : [];
    const modalTabs = isCBCForm
        ? ['📋 Basic Info', '🏠 Location', '👨‍👩‍👦 Guardian', '🏥 Medical', '🎓 Academic', '🛤️ CBC Pathway']
        : ['📋 Basic Info', '🏠 Location', '👨‍👩‍👦 Guardian', '🏥 Medical', '🎓 Academic'];

    const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all";
    const labelClass = "block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider";

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'scaleIn 0.2s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                    <h3 className="text-lg font-bold text-white">{editId ? '✏️ Edit Student' : '➕ Enroll New Student'}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 text-white/90 hover:bg-white/30 flex items-center justify-center transition-all">
                        <FiX size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
                    {modalTabs.map((t, i) => (
                        <button key={i} onClick={() => setModalTab(i)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${modalTab === i ? 'text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                            style={modalTab === i ? { background: 'linear-gradient(135deg, #3b82f6, #6366f1)' } : {}}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* Tab 0: Basic Info */}
                    {modalTab === 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Admission No *</label><input type="text" value={formData.admission_no} onChange={e => setFormData({ ...formData, admission_no: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>First Name *</label><input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>Middle Name</label><input type="text" value={formData.middle_name} onChange={e => setFormData({ ...formData, middle_name: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>Last Name *</label><input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>Gender *</label><select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className={inputClass}><option value="Male">👦 Male</option><option value="Female">👧 Female</option></select></div>
                            <div><label className={labelClass}>Date of Birth 🎂</label>
                                <SmartDatePicker
                                    value={formData.date_of_birth}
                                    onChange={v => setFormData({ ...formData, date_of_birth: v })}
                                    mode="dob"
                                    placeholder="Select date of birth"
                                /></div>
                            <div>
                                <label className={labelClass}>Form</label>
                                <select value={formData.form_id || ''} onChange={e => setFormData({ ...formData, form_id: e.target.value ? Number(e.target.value) : null })} className={inputClass}>
                                    <option value="">Select Form</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}{f.education_system === 'CBC_Senior_School' ? ' [CBC]' : ' [8-4-4]'}</option>)}
                                </select>
                                {formData.form_id && (() => {
                                    const sys = getEducationSystem(Number(formData.form_id), forms);
                                    return sys ? <div className="mt-1.5 flex items-center gap-1.5"><EducationSystemBadge system={sys} /><span className="text-[10px] text-gray-400">{sys === 'CBC_Senior_School' ? 'CBC pathway required' : '8-4-4 curriculum'}</span></div> : null;
                                })()}
                            </div>
                            <div><label className={labelClass}>Stream</label><select value={formData.stream_id || ''} onChange={e => setFormData({ ...formData, stream_id: e.target.value ? Number(e.target.value) : null })} className={inputClass}><option value="">Select Stream</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                            <div><label className={labelClass}>Admission Date 📅</label>
                                <SmartDatePicker
                                    value={formData.admission_date}
                                    onChange={v => setFormData({ ...formData, admission_date: v })}
                                    mode="date"
                                    placeholder="Select admission date"
                                /></div>
                            <div><label className={labelClass}>Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={inputClass}><option value="Active">✅ Active</option><option value="Inactive">❌ Inactive</option><option value="Transferred">🔄 Transferred</option><option value="Graduated">🎓 Graduated</option><option value="Suspended">⚠️ Suspended</option></select></div>
                            <div><label className={labelClass}>Religion</label><select value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} className={inputClass}><option value="">Select</option><option value="Christian">Christian</option><option value="Muslim">Muslim</option><option value="Hindu">Hindu</option><option value="Traditional">Traditional</option><option value="Other">Other</option></select></div>
                        </div>
                    )}

                    {/* Tab 1: Location */}
                    {modalTab === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Nationality</label><select value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className={inputClass}>{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            <div><label className={labelClass}>County</label><select value={formData.county} onChange={e => setFormData({ ...formData, county: e.target.value, sub_county: '' })} className={inputClass}><option value="">Select County</option>{COUNTY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className={labelClass}>Sub-County</label><select value={formData.sub_county} onChange={e => setFormData({ ...formData, sub_county: e.target.value })} className={inputClass} disabled={!formData.county}><option value="">Select Sub-County</option>{subCounties.map((sc: string) => <option key={sc} value={sc}>{sc}</option>)}</select></div>
                            <div><label className={labelClass}>Village / Estate</label><input type="text" value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} className={inputClass} /></div>
                        </div>
                    )}

                    {/* Tab 2: Guardian */}
                    {modalTab === 2 && (
                        <div className="space-y-5">
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium">👨‍👩‍👦 Primary Guardian / Parent Information</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Guardian Full Name *</label><input type="text" value={formData.guardian_name} onChange={e => setFormData({ ...formData, guardian_name: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Phone Number *</label><input type="tel" value={formData.guardian_phone} onChange={e => setFormData({ ...formData, guardian_phone: e.target.value })} className={inputClass} placeholder="0712345678" /></div>
                                <div><label className={labelClass}>Email</label><input type="email" value={formData.guardian_email} onChange={e => setFormData({ ...formData, guardian_email: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Relationship</label><select value={formData.guardian_relationship} onChange={e => setFormData({ ...formData, guardian_relationship: e.target.value })} className={inputClass}><option value="Parent">Parent</option><option value="Father">Father</option><option value="Mother">Mother</option><option value="Guardian">Guardian</option><option value="Uncle">Uncle</option><option value="Aunt">Aunt</option><option value="Grandparent">Grandparent</option><option value="Sibling">Sibling</option><option value="Other">Other</option></select></div>
                                <div><label className={labelClass}>ID Number</label><input type="text" value={formData.guardian_id_no} onChange={e => setFormData({ ...formData, guardian_id_no: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Occupation</label><input type="text" value={formData.guardian_occupation} onChange={e => setFormData({ ...formData, guardian_occupation: e.target.value })} className={inputClass} /></div>
                            </div>
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">🚨 Emergency Contact</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Emergency Contact Name</label><input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Emergency Phone</label><input type="tel" value={formData.emergency_contact_phone} onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className={inputClass} /></div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Medical */}
                    {modalTab === 3 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Blood Group</label><select value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} className={inputClass}><option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                            <div className="sm:col-span-2"><label className={labelClass}>Medical Conditions</label><textarea value={formData.medical_conditions} onChange={e => setFormData({ ...formData, medical_conditions: e.target.value })} className={`${inputClass} min-h-[80px]`} placeholder="e.g. Asthma, allergies..." /></div>
                            <div className="sm:col-span-2"><label className={labelClass}>Special Needs / Disability</label><textarea value={formData.special_needs} onChange={e => setFormData({ ...formData, special_needs: e.target.value })} className={`${inputClass} min-h-[80px]`} /></div>
                        </div>
                    )}

                    {/* Tab 4: Academic */}
                    {modalTab === 4 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Previous School</label><input type="text" value={formData.previous_school} onChange={e => setFormData({ ...formData, previous_school: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>KCPE Marks</label><input type="text" value={formData.kcpe_marks} onChange={e => setFormData({ ...formData, kcpe_marks: e.target.value })} className={inputClass} placeholder="e.g. 350" /></div>
                            <div><label className={labelClass}>Birth Certificate No</label><input type="text" value={formData.birth_cert_no} onChange={e => setFormData({ ...formData, birth_cert_no: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>NEMIS / UPI Number</label><input type="text" value={formData.nemis_no} onChange={e => setFormData({ ...formData, nemis_no: e.target.value })} className={inputClass} /></div>
                            <div className="sm:col-span-2"><label className={labelClass}>Additional Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className={`${inputClass} min-h-[80px]`} /></div>
                        </div>
                    )}

                    {/* Tab 5: CBC Pathway */}
                    {modalTab === 5 && isCBCForm && (
                        <CBCEnrollmentStep
                            pathways={cbcPathways}
                            pathwaySubjects={cbcPathwaySubjects}
                            allSubjects={allSubjects}
                            selectedPathwayId={selectedPathwayId}
                            selectedElectives={selectedElectives}
                            onPathwayChange={onPathwayChange}
                            onElectivesChange={onElectivesChange}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-2">
                        {modalTab > 0 && (
                            <button onClick={() => setModalTab(modalTab - 1)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
                                ← Previous
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {modalTab < modalTabs.length - 1 ? (
                            <button onClick={() => setModalTab(modalTab + 1)} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                Next →
                            </button>
                        ) : (
                            <button onClick={onSave} className="px-8 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                <FiSave size={14} /> {editId ? 'Update Student' : 'Enroll Student'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}

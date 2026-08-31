'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    FiUser, FiPhone, FiMail, FiFileText, FiCheckCircle,
    FiCopy, FiExternalLink, FiChevronRight, FiChevronLeft,
    FiStar, FiShield, FiClock, FiBook, FiAlertCircle,
    FiUpload, FiRefreshCw, FiLock, FiCalendar, FiMapPin,
    FiHeart, FiInfo,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/* ── Helpers ─────────────────────────────────────────────────────────────── */
const formLabel = (v: string | number) => {
    const n = Number(v);
    if (n===10) return 'Grade 10 (CBC)'; if (n===11) return 'Grade 11 (CBC)';
    if (n===12) return 'Grade 12 (CBC)'; if (n>=1&&n<=4) return `Form ${n} (8-4-4)`;
    return String(v);
};
function getAge(dob: string): number {
    if (!dob) return 0;
    const d=new Date(dob); const n=new Date();
    let age=n.getFullYear()-d.getFullYear();
    if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))age--;
    return age;
}

/* ── Date Picker ─────────────────────────────────────────────────────────── */
const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS=['Su','Mo','Tu','We','Th','Fr','Sa'];

function DatePicker({ value, onChange, required, minAge=10, maxAge=22 }: {
    value:string; onChange:(v:string)=>void; required?:boolean; minAge?:number; maxAge?:number;
}) {
    const today=new Date();
    const maxDate=new Date(today.getFullYear()-minAge,today.getMonth(),today.getDate());
    const minDate=new Date(today.getFullYear()-maxAge,today.getMonth(),today.getDate());
    const parsed=value?new Date(value+'T00:00:00'):null;
    const initYear=parsed?parsed.getFullYear():maxDate.getFullYear();
    const initMonth=parsed?parsed.getMonth():maxDate.getMonth();
    const [open,setOpen]=useState(false);
    const [viewYear,setViewYear]=useState(initYear);
    const [viewMonth,setViewMonth]=useState(initMonth);
    const ref=useRef<HTMLDivElement>(null);
    useEffect(()=>{
        const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};
        document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h);
    },[]);
    useEffect(()=>{if(value){const d=new Date(value+'T00:00:00');setViewYear(d.getFullYear());setViewMonth(d.getMonth());};},[value]);
    const age=value?getAge(value):null;
    const valid=age!==null&&age>=minAge&&age<=maxAge;
    const firstDay=new Date(viewYear,viewMonth,1).getDay();
    const daysInMon=new Date(viewYear,viewMonth+1,0).getDate();
    const cells:(number|null)[]=[...Array(firstDay).fill(null),...Array.from({length:daysInMon},(_,i)=>i+1)];
    while(cells.length%7!==0)cells.push(null);
    const selectDay=(day:number)=>{const m=String(viewMonth+1).padStart(2,'0');const d=String(day).padStart(2,'0');onChange(`${viewYear}-${m}-${d}`);setOpen(false);};
    const isDayDisabled=(day:number)=>{const dt=new Date(viewYear,viewMonth,day);return dt>maxDate||dt<minDate;};
    const isDaySelected=(day:number)=>{if(!parsed)return false;return parsed.getFullYear()===viewYear&&parsed.getMonth()===viewMonth&&parsed.getDate()===day;};
    const yearRange=Array.from({length:maxAge-minAge+1},(_,i)=>maxDate.getFullYear()-i);
    const displayVal=parsed?parsed.toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'}):'Select date of birth';
    return(
        <div ref={ref} style={{position:'relative'}}>
            <button type="button" onClick={()=>setOpen(o=>!o)} style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'12px 16px',border:`2px solid ${open?'#0d9488':value?'#99f6e4':'#e2e8f0'}`,borderRadius:14,background:value?'#f0fdfa':'#fff',cursor:'pointer',transition:'all 0.2s',boxShadow:open?'0 0 0 4px rgba(13,148,136,0.12)':'none'}}>
                <FiCalendar size={16} color={value?'#0d9488':'#94a3b8'} style={{flexShrink:0}}/>
                <span style={{flex:1,textAlign:'left',fontSize:13,fontWeight:value?700:400,color:value?'#0f172a':'#94a3b8'}}>{displayVal}</span>
                {age!==null&&<span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:20,background:valid?'#ccfbf1':'#fee2e2',color:valid?'#0d9488':'#dc2626'}}>{age} yrs {valid?'✓':'✗'}</span>}
                <span style={{fontSize:10,color:'#94a3b8',transform:open?'rotate(180deg)':'none',transition:'transform 0.2s'}}>▼</span>
            </button>
            {open&&(
                <div style={{position:'absolute',top:'calc(100% + 8px)',left:0,zIndex:9999,background:'#fff',borderRadius:20,boxShadow:'0 20px 60px rgba(0,0,0,0.15)',border:'1px solid #e2e8f0',minWidth:300,overflow:'hidden'}}>
                    <style>{`@keyframes dpFadeIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}.dp-day:hover:not(:disabled){background:#0d9488!important;color:#fff!important;}`}</style>
                    <div style={{background:'linear-gradient(135deg,#0f766e,#0d9488)',padding:'14px 16px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                            <FiCalendar size={14} color="#99f6e4"/>
                            <span style={{fontSize:11,fontWeight:700,color:'#99f6e4',letterSpacing:'0.08em',textTransform:'uppercase'}}>Date of Birth</span>
                            {age!==null&&<span style={{marginLeft:'auto',fontSize:11,fontWeight:800,color:valid?'#ccfbf1':'#fca5a5'}}>Age: {age} {valid?'✓ Valid':`✗ Must be ${minAge}–${maxAge} yrs`}</span>}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                            <select value={viewMonth} onChange={e=>setViewMonth(Number(e.target.value))} style={{flex:2,padding:'6px 10px',borderRadius:10,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',outline:'none'}}>
                                {MONTHS.map((m,i)=><option key={i} value={i} style={{background:'#0f766e',color:'#fff'}}>{m}</option>)}
                            </select>
                            <select value={viewYear} onChange={e=>setViewYear(Number(e.target.value))} style={{flex:1,padding:'6px 10px',borderRadius:10,border:'none',background:'rgba(255,255,255,0.15)',color:'#fff',fontWeight:700,fontSize:13,cursor:'pointer',outline:'none'}}>
                                {yearRange.map(y=><option key={y} value={y} style={{background:'#0f766e',color:'#fff'}}>{y}</option>)}
                            </select>
                            <button type="button" onClick={()=>{if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}else setViewMonth(m=>m-1);}} style={{padding:'6px 10px',borderRadius:10,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',cursor:'pointer',fontWeight:900}}>‹</button>
                            <button type="button" onClick={()=>{if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}else setViewMonth(m=>m+1);}} style={{padding:'6px 10px',borderRadius:10,background:'rgba(255,255,255,0.15)',border:'none',color:'#fff',cursor:'pointer',fontWeight:900}}>›</button>
                        </div>
                    </div>
                    <div style={{padding:'12px 14px 16px'}}>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',marginBottom:6}}>
                            {DAYS.map(d=><div key={d} style={{textAlign:'center',fontSize:10,fontWeight:700,color:'#94a3b8',padding:'4px 0'}}>{d}</div>)}
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
                            {cells.map((day,idx)=>{if(!day)return<div key={idx}/>;const disabled=isDayDisabled(day);const sel=isDaySelected(day);return(
                                <button key={idx} type="button" className="dp-day" disabled={disabled} onClick={()=>!disabled&&selectDay(day)}
                                    style={{width:'100%',aspectRatio:'1',borderRadius:10,border:'none',cursor:disabled?'not-allowed':'pointer',fontSize:12,fontWeight:sel?900:500,transition:'all 0.15s',background:sel?'#0d9488':'transparent',color:sel?'#fff':disabled?'#d1d5db':'#0f172a',boxShadow:sel?'0 2px 8px rgba(13,148,136,0.4)':'none'}}>
                                    {day}
                                </button>
                            );})}
                        </div>
                        <p style={{margin:'10px 0 0',fontSize:10,color:'#94a3b8',textAlign:'center',fontStyle:'italic'}}>Valid age: {minAge}–{maxAge} years</p>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ── OTP Input ───────────────────────────────────────────────────────────── */
function OtpInput({ value, onChange, disabled }: { value:string; onChange:(v:string)=>void; disabled?:boolean }) {
    const inputs=useRef<(HTMLInputElement|null)[]>([]);
    const digits=value.padEnd(6,'').split('').slice(0,6);
    const handleKey=(i:number,e:React.KeyboardEvent<HTMLInputElement>)=>{if(e.key==='Backspace'&&!digits[i]&&i>0)inputs.current[i-1]?.focus();};
    const handleChange=(i:number,v:string)=>{const d=v.replace(/\D/g,'').slice(-1);const next=[...digits];next[i]=d;onChange(next.join('').slice(0,6));if(d&&i<5)setTimeout(()=>inputs.current[i+1]?.focus(),10);};
    const handlePaste=(e:React.ClipboardEvent)=>{const p=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,6);onChange(p);if(p.length===6)inputs.current[5]?.focus();};
    return(
        <div className="flex gap-2 justify-center">
            {[0,1,2,3,4,5].map(i=>(
                <input key={i} ref={el=>{inputs.current[i]=el;}} type="text" inputMode="numeric" maxLength={1}
                    value={digits[i]||''} onChange={e=>handleChange(i,e.target.value)} onKeyDown={e=>handleKey(i,e)} onPaste={handlePaste} disabled={disabled}
                    className={`w-12 h-14 text-center text-2xl font-black border-2 rounded-2xl outline-none transition-all ${digits[i]?'border-teal-500 bg-teal-50 text-teal-800':'border-gray-200 bg-white'} focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:opacity-50`}/>
            ))}
        </div>
    );
}

/* ── Types ───────────────────────────────────────────────────────────────── */
interface FormData {
    // Student
    student_first_name: string; student_middle_name: string; student_last_name: string;
    date_of_birth: string; gender: string; nationality: string;
    // Location
    county: string; sub_county: string; village_estate: string;
    // Academic
    form_applied_for: string; previous_school: string; previous_school_county: string;
    kcpe_index_number: string; kcpe_total_marks: string; kcpe_year: string;
    // Guardian
    guardian_full_name: string; guardian_relationship: string;
    guardian_phone: string; guardian_alt_phone: string;
    guardian_email: string; guardian_national_id: string;
    guardian_occupation: string; guardian_county: string;
    // Emergency
    emergency_name: string; emergency_phone: string; emergency_relationship: string;
    // Medical
    blood_group: string; has_disability: boolean;
    disability_details: string; allergies: string; medical_conditions: string;
}

const EMPTY: FormData = {
    student_first_name:'', student_middle_name:'', student_last_name:'',
    date_of_birth:'', gender:'', nationality:'Kenyan',
    county:'', sub_county:'', village_estate:'',
    form_applied_for:'', previous_school:'', previous_school_county:'',
    kcpe_index_number:'', kcpe_total_marks:'', kcpe_year:String(new Date().getFullYear()-1),
    guardian_full_name:'', guardian_relationship:'Parent',
    guardian_phone:'', guardian_alt_phone:'',
    guardian_email:'', guardian_national_id:'',
    guardian_occupation:'', guardian_county:'',
    emergency_name:'', emergency_phone:'', emergency_relationship:'',
    blood_group:'', has_disability:false,
    disability_details:'', allergies:'', medical_conditions:'',
};

const KENYAN_COUNTIES = [
    'Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay',
    'Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii',
    'Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera',
    'Marsabit','Meru','Migori','Mombasa','Murang\'a','Nairobi','Nakuru','Nandi',
    'Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita-Taveta','Tana River',
    'Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot',
];

const inp = 'w-full px-4 py-3 border-2 border-gray-200 rounded-2xl text-sm font-medium bg-white focus:border-teal-400 focus:ring-4 focus:ring-teal-100 outline-none transition-all placeholder-gray-300';
const lbl = 'block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5';

/* ── Steps ───────────────────────────────────────────────────────────────── */
const STEPS = [
    {n:1, label:'Student',   icon:'🎓'},
    {n:2, label:'Academic',  icon:'📚'},
    {n:3, label:'Guardian',  icon:'👪'},
    {n:4, label:'Medical',   icon:'🏥'},
    {n:5, label:'Documents', icon:'📄'},
    {n:6, label:'Verify',    icon:'✉️'},
    {n:7, label:'Submit',    icon:'✅'},
];

function StepIndicator({ step }: { step: number }) {
    return (
        <div className="mb-6 overflow-x-auto">
            <div className="flex items-center min-w-max mx-auto px-2">
                {STEPS.map((s,i)=>(
                    <div key={s.n} className="flex items-center">
                        <div className="flex flex-col items-center">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${step===s.n?'text-white border-transparent shadow-lg scale-110':step>s.n?'text-white border-transparent':'bg-white border-gray-200 text-gray-400'}`}
                                style={step===s.n?{background:'linear-gradient(135deg,#0f766e,#0891b2)'}:step>s.n?{background:'linear-gradient(135deg,#22c55e,#16a34a)'}:{}}>
                                {step>s.n?'✓':s.icon}
                            </div>
                            <p className={`text-[9px] font-bold mt-1 ${step===s.n?'text-teal-700':step>s.n?'text-green-600':'text-gray-400'}`}>{s.label}</p>
                        </div>
                        {i<STEPS.length-1&&<div className={`h-0.5 w-6 mx-1 mb-4 rounded transition-all ${step>s.n?'bg-green-400':'bg-gray-200'}`}/>}
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ── Doc Upload ──────────────────────────────────────────────────────────── */
function DocUpload({ label, icon, accept, onUpload, uploaded }: {
    label:string; icon:string; accept:string;
    onUpload:(url:string)=>void; uploaded?:string;
}) {
    const [uploading,setUploading]=useState(false);
    const inputRef=useRef<HTMLInputElement>(null);
    const handleFile=async(e:React.ChangeEvent<HTMLInputElement>)=>{
        const file=e.target.files?.[0]; if(!file) return;
        if(file.size>5*1024*1024){toast.error('File too large. Max 5MB');return;}
        setUploading(true);
        try{
            const sb=createClient(supabaseUrl,supabaseAnon);
            const ext=file.name.split('.').pop();
            const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            const{error}=await sb.storage.from('admission-docs').upload(path,file,{upsert:true});
            if(error)throw error;
            const{data}=sb.storage.from('admission-docs').getPublicUrl(path);
            onUpload(data.publicUrl);
            toast.success(`✅ ${label} uploaded!`);
        }catch(e:any){toast.error('Upload failed: '+e.message);}
        finally{setUploading(false);}
    };
    return(
        <div className={`border-2 rounded-2xl p-4 transition-all cursor-pointer ${uploaded?'border-green-300 bg-green-50':'border-dashed border-gray-200 bg-gray-50 hover:border-teal-300 hover:bg-teal-50'}`}
            onClick={()=>!uploaded&&inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleFile}/>
            <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div className="flex-1">
                    <p className="text-xs font-black text-gray-700">{label}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                        {uploading?'Uploading…':uploaded?'✅ Uploaded — click to change':'PDF, JPG or PNG · Max 5MB'}
                    </p>
                </div>
                {uploading&&<div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"/>}
                {uploaded&&!uploading&&<span className="text-green-600 text-lg">✅</span>}
                {!uploaded&&!uploading&&<FiUpload size={16} className="text-gray-400"/>}
            </div>
        </div>
    );
}

/* ── Field Row (for review step) ─────────────────────────────────────────── */
function ReviewRow({label,value}:{label:string;value?:string|null}) {
    return value?(
        <div className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide min-w-[110px] pt-0.5">{label}</span>
            <span className="text-sm font-semibold text-gray-800 flex-1">{value}</span>
        </div>
    ):null;
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */
export default function AdmissionsPage() {
    const [step, setStep]     = useState(1);
    const [form, setForm]     = useState<FormData>(EMPTY);
    const [submitting, setSub]= useState(false);
    const [refNo, setRefNo]   = useState<string|null>(null);

    // Documents
    const [photoUrl,setPhotoUrl]           = useState('');
    const [birthCertUrl,setBirthCertUrl]   = useState('');
    const [kcpeSlipUrl,setKcpeSlipUrl]     = useState('');
    const [otherDocUrl,setOtherDocUrl]     = useState('');

    // OTP
    const [otpSent,setOtpSent]           = useState(false);
    const [otpCode,setOtpCode]           = useState('');
    const [otpVerified,setOtpVerified]   = useState(false);
    const [verToken,setVerToken]         = useState('');
    const [sendingOtp,setSendingOtp]     = useState(false);
    const [verifyingOtp,setVerifying]    = useState(false);
    const [otpAttempts,setAttempts]      = useState(0);
    const [countdown,setCountdown]       = useState(0);
    const [termsAgreed,setTerms]         = useState(false);

    const set=(f:keyof FormData,v:any)=>setForm(p=>({...p,[f]:v}));

    useEffect(()=>{
        if(countdown<=0)return;
        const t=setTimeout(()=>setCountdown(c=>c-1),1000);
        return()=>clearTimeout(t);
    },[countdown]);

    /* ── Validation ────────────────────────────────────────────────────── */
    const validate=():string|null=>{
        if(step===1){
            if(!form.student_first_name.trim()) return 'First name is required';
            if(!form.student_last_name.trim())  return 'Last name is required';
            if(!form.date_of_birth)             return 'Date of birth is required';
            if(!form.gender)                    return 'Gender is required';
            const a=getAge(form.date_of_birth);
            if(a<10||a>22) return `Student age (${a}) is outside the valid range (10–22 years)`;
        }
        if(step===2){
            if(!form.form_applied_for) return 'Please select the form/grade applying for';
            if(!form.kcpe_index_number.trim()) return 'KCPE index number is required';
            const k=form.kcpe_index_number.replace(/\s+/g,'');
            if(!/^\d{11,12}$/.test(k)) return 'KCPE index must be 11–12 digits';
            if(form.kcpe_total_marks){
                const m=Number(form.kcpe_total_marks);
                if(isNaN(m)||m<100||m>500) return 'KCPE marks must be between 100 and 500';
            }
        }
        if(step===3){
            if(!form.guardian_full_name.trim()) return 'Guardian full name is required';
            const phone=form.guardian_phone.replace(/\s+/g,'');
            if(!phone) return 'Guardian phone is required';
            if(!/^(\+254|0)[17]\d{8}$/.test(phone)) return 'Enter a valid Kenyan phone (e.g. 0712345678)';
            if(!form.guardian_national_id.trim()) return 'Guardian National ID is required';
            if(!/^\d{7,8}$/.test(form.guardian_national_id.replace(/\s+/g,''))) return 'National ID must be 7–8 digits';
        }
        if(step===6){
            if(!otpVerified) return 'Please verify your email to continue';
        }
        if(step===7){
            if(!termsAgreed) return 'Please agree to the declaration to submit';
        }
        return null;
    };

    const nextStep=()=>{
        const err=validate(); if(err){toast.error(err);return;}
        setStep(s=>s+1); window.scrollTo({top:0,behavior:'smooth'});
    };
    const prevStep=()=>{setStep(s=>s-1); window.scrollTo({top:0,behavior:'smooth'});};

    /* ── Send OTP ──────────────────────────────────────────────────────── */
    const sendOTP=async()=>{
        const phone=form.guardian_phone.replace(/\s+/g,'');
        const email=form.guardian_email.trim();
        if(!email){toast.error('Please enter guardian email address in Step 3 first');return;}
        setSendingOtp(true);
        try{
            const r=await fetch('/api/admissions/send-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,email})});
            const d=await r.json();
            if(!r.ok){toast.error(d.error||'Failed to send code');return;}
            setOtpSent(true); setOtpCode(''); setCountdown(60);
            toast.success(`✅ Code sent to ${email}`);
        }catch{toast.error('Network error');}
        finally{setSendingOtp(false);}
    };

    /* ── Verify OTP ────────────────────────────────────────────────────── */
    const verifyOTP=async()=>{
        if(otpCode.length!==6){toast.error('Enter the full 6-digit code');return;}
        if(otpAttempts>=5){toast.error('Too many attempts. Request a new code');return;}
        setVerifying(true);
        try{
            const phone=form.guardian_phone.replace(/\s+/g,'');
            const r=await fetch('/api/admissions/verify-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phone,otp:otpCode})});
            const d=await r.json();
            if(!r.ok){setAttempts(a=>a+1);toast.error(d.error||'Incorrect code');return;}
            setOtpVerified(true); setVerToken(d.token);
            toast.success('✅ Email verified!');
        }catch{toast.error('Network error');}
        finally{setVerifying(false);}
    };

    /* ── Submit ────────────────────────────────────────────────────────── */
    const handleSubmit=async()=>{
        if(!termsAgreed){toast.error('Please agree to the declaration');return;}
        setSub(true);
        try{
            const payload:any={
                // Student
                student_first_name: form.student_first_name.trim(),
                student_middle_name: form.student_middle_name.trim()||undefined,
                student_last_name:  form.student_last_name.trim(),
                date_of_birth:      form.date_of_birth,
                gender:             form.gender,
                nationality:        form.nationality||'Kenyan',
                // Location
                county:             form.county||undefined,
                sub_county:         form.sub_county||undefined,
                village_estate:     form.village_estate||undefined,
                // Academic
                form_applied_for:   Number(form.form_applied_for),
                previous_school:    form.previous_school.trim()||undefined,
                previous_school_county: form.previous_school_county||undefined,
                kcpe_index_number:  form.kcpe_index_number.replace(/\s+/g,''),
                kcpe_total_marks:   form.kcpe_total_marks?Number(form.kcpe_total_marks):undefined,
                kcpe_year:          form.kcpe_year?Number(form.kcpe_year):undefined,
                // Guardian
                guardian_full_name: form.guardian_full_name.trim(),
                guardian_relationship: form.guardian_relationship||'Parent',
                guardian_phone:     form.guardian_phone.replace(/\s+/g,''),
                guardian_alt_phone: form.guardian_alt_phone.replace(/\s+/g,'')||undefined,
                guardian_email:     form.guardian_email.trim()||undefined,
                guardian_national_id: form.guardian_national_id.replace(/\s+/g,''),
                guardian_occupation: form.guardian_occupation.trim()||undefined,
                guardian_county:    form.guardian_county||undefined,
                // Emergency
                emergency_name:     form.emergency_name.trim()||undefined,
                emergency_phone:    form.emergency_phone.replace(/\s+/g,'')||undefined,
                emergency_relationship: form.emergency_relationship||undefined,
                // Medical
                blood_group:        form.blood_group||undefined,
                has_disability:     form.has_disability,
                disability_details: form.disability_details.trim()||undefined,
                allergies:          form.allergies.trim()||undefined,
                medical_conditions: form.medical_conditions.trim()||undefined,
                // Documents
                photo_url:          photoUrl||undefined,
                birth_cert_url:     birthCertUrl||undefined,
                kcpe_slip_url:      kcpeSlipUrl||undefined,
                other_doc_url:      otherDocUrl||undefined,
                // Auth
                verification_token: verToken,
                terms_agreed:       true,
                honeypot:           '',
            };
            const res=await fetch('/api/admissions/apply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
            const result=await res.json();
            if(res.status===409){toast.error('An application with this KCPE index already exists');return;}
            if(res.status===403){toast.error('Verification required. Please go back to Step 6');return;}
            if(!res.ok)throw new Error(result.error||'Submission failed');
            setRefNo(result.reference_number);
            window.scrollTo({top:0,behavior:'smooth'});
        }catch(e:any){toast.error(e.message);}
        finally{setSub(false);}
    };

    const reset=()=>{
        setRefNo(null);setForm(EMPTY);setStep(1);setPhotoUrl('');setBirthCertUrl('');
        setKcpeSlipUrl('');setOtherDocUrl('');setOtpSent(false);setOtpCode('');
        setOtpVerified(false);setVerToken('');setTerms(false);setCountdown(0);setAttempts(0);
    };

    const kcpeRating=form.kcpe_total_marks?Number(form.kcpe_total_marks)>=350?'🌟 Excellent':Number(form.kcpe_total_marks)>=250?'👍 Good':'📚 Needs Support':'';

    /* ═══════════════════════════════════════════════════════════
       RENDER
    ═══════════════════════════════════════════════════════════ */
    return (
        <div className="min-h-screen" style={{background:'linear-gradient(160deg,#f0fdf4 0%,#ecfeff 50%,#f0f9ff 100%)'}}>

            {/* NAV */}
            <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}>
                            <FiBook size={16}/>
                        </div>
                        <div>
                            <p className="text-sm font-extrabold text-gray-800">APSIMS School</p>
                            <p className="text-[10px] text-gray-400 font-medium">Online Admissions Portal</p>
                        </div>
                    </div>
                    <a href="/admissions/status" className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition">
                        <FiExternalLink size={11}/> Track Application
                    </a>
                </div>
            </nav>

            {/* HERO */}
            <div className="relative overflow-hidden" style={{background:'linear-gradient(135deg,#0f766e 0%,#0891b2 60%,#0369a1 100%)'}}>
                <div className="absolute inset-0 opacity-[0.05]" style={{backgroundImage:'radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)',backgroundSize:'20px 20px'}}/>
                <div className="relative max-w-4xl mx-auto px-4 py-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-4" style={{background:'rgba(255,255,255,0.15)',color:'#fff'}}>
                        <FiStar size={11}/> Academic Year 2025–2026 Admissions Open
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">Apply for Admission</h1>
                    <p className="text-teal-100 text-sm max-w-md mx-auto mb-5">Complete all 7 steps. All information must match the original documents you will present on reporting day.</p>
                    <div className="flex items-center justify-center gap-5 flex-wrap text-teal-200 text-xs">
                        <span className="flex items-center gap-1.5"><FiShield size={12}/> Secure & Confidential</span>
                        <span className="flex items-center gap-1.5"><FiClock size={12}/> ~10 minutes</span>
                        <span className="flex items-center gap-1.5"><FiLock size={12}/> Email Verified</span>
                        <span className="flex items-center gap-1.5"><FiCheckCircle size={12}/> Free to Apply</span>
                    </div>
                </div>
            </div>

            {/* MAIN */}
            <div className="max-w-2xl mx-auto px-4 py-8">
                {refNo?(
                    /* ── SUCCESS SCREEN ───────────────────────────────── */
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center">
                        <div className="relative inline-block mb-6">
                            <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-2xl" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}>
                                <FiCheckCircle size={48} className="text-white"/>
                            </div>
                            <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}/>
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 mb-2">Application Submitted! 🎉</h2>
                        <p className="text-gray-500 text-sm mb-1">Dear {form.guardian_full_name || 'Guardian'},</p>
                        <p className="text-gray-400 text-sm mb-6">Your application has been received. The school will review within <strong>3–5 working days</strong>.</p>
                        <div className="bg-gradient-to-r from-teal-50 to-sky-50 border-2 border-teal-200 rounded-2xl p-6 mb-6 mx-auto max-w-xs">
                            <p className="text-xs font-bold text-teal-600 uppercase tracking-wider mb-2 flex items-center justify-center gap-1"><FiShield size={12}/> Reference Number</p>
                            <p className="text-2xl font-black text-teal-700 tracking-widest font-mono">{refNo}</p>
                            <p className="text-[11px] text-gray-400 mt-2">Save this to track your application</p>
                        </div>
                        <div className="flex gap-3 mb-5 max-w-sm mx-auto">
                            <button onClick={()=>navigator.clipboard.writeText(refNo).then(()=>toast.success('Copied!'))}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-teal-300 text-teal-700 font-bold rounded-2xl hover:bg-teal-50 transition text-sm">
                                <FiCopy size={14}/> Copy Ref
                            </button>
                            <a href="/admissions/status" className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-white font-bold rounded-2xl text-sm shadow-lg hover:opacity-90 transition"
                                style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}>
                                <FiExternalLink size={14}/> Track Status
                            </a>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left max-w-sm mx-auto">
                            <p className="text-xs font-black text-amber-700 uppercase mb-2">📋 What Happens Next?</p>
                            <div className="space-y-1 text-xs text-amber-800">
                                <p>1. School reviews application (3–5 working days)</p>
                                <p>2. You'll receive an email notification</p>
                                <p>3. If approved, visit school with <strong>original documents</strong></p>
                                <p>4. Track: <strong>apsims.vercel.app/admissions/status</strong></p>
                            </div>
                        </div>
                        <button onClick={reset} className="mt-5 text-sm text-gray-400 hover:text-teal-600 underline transition">Submit another application</button>
                    </div>
                ):(
                    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
                        <StepIndicator step={step}/>

                        {/* ══ STEP 1: STUDENT INFO ══════════════════════ */}
                        {step===1&&(
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}><FiUser size={18}/></div>
                                    <div><h2 className="text-lg font-extrabold text-gray-800">Student Personal Information</h2><p className="text-xs text-gray-400">Basic details about the student applying</p></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div><label className={lbl}>First Name <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.student_first_name} onChange={e=>set('student_first_name',e.target.value)} placeholder="e.g. John" className={inp} autoComplete="given-name"/></div>
                                    <div><label className={lbl}>Middle Name <span className="text-gray-300">(opt.)</span></label>
                                        <input type="text" value={form.student_middle_name} onChange={e=>set('student_middle_name',e.target.value)} placeholder="e.g. Kamau" className={inp}/></div>
                                    <div><label className={lbl}>Last Name <span className="text-red-400">*</span></label>
                                        <input type="text" value={form.student_last_name} onChange={e=>set('student_last_name',e.target.value)} placeholder="e.g. Mwangi" className={inp} autoComplete="family-name"/></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={lbl}>Date of Birth <span className="text-red-400">*</span></label>
                                        <DatePicker value={form.date_of_birth} onChange={v=>set('date_of_birth',v)} minAge={10} maxAge={22} required/></div>
                                    <div><label className={lbl}>Gender <span className="text-red-400">*</span></label>
                                        <div className="flex gap-3">
                                            {['Male','Female'].map(g=>(
                                                <button key={g} type="button" onClick={()=>set('gender',g)}
                                                    className={`flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-all ${form.gender===g?'text-white border-transparent shadow-md':'bg-white text-gray-500 border-gray-200 hover:border-teal-300'}`}
                                                    style={form.gender===g?{background:'linear-gradient(135deg,#0f766e,#0891b2)'}:{}}>
                                                    {g==='Male'?'👦':'👧'} {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={lbl}>Nationality</label>
                                        <input type="text" value={form.nationality} onChange={e=>set('nationality',e.target.value)} placeholder="e.g. Kenyan" className={inp}/></div>
                                </div>

                                {/* Location */}
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                    <p className="text-xs font-black text-blue-700 mb-3 flex items-center gap-1.5"><FiMapPin size={12}/> Student Location / Home Area</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div><label className={lbl}>County</label>
                                            <select value={form.county} onChange={e=>set('county',e.target.value)} className={inp}>
                                                <option value="">— Select County —</option>
                                                {KENYAN_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
                                            </select></div>
                                        <div><label className={lbl}>Sub-County</label>
                                            <input type="text" value={form.sub_county} onChange={e=>set('sub_county',e.target.value)} placeholder="e.g. Westlands" className={inp}/></div>
                                        <div><label className={lbl}>Village / Estate</label>
                                            <input type="text" value={form.village_estate} onChange={e=>set('village_estate',e.target.value)} placeholder="e.g. Kibera, Karen" className={inp}/></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ STEP 2: ACADEMIC INFO ═════════════════════ */}
                        {step===2&&(
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}><FiBook size={18}/></div>
                                    <div><h2 className="text-lg font-extrabold text-gray-800">Academic Information</h2><p className="text-xs text-gray-400">School details and KCPE examination results</p></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={lbl}>Form / Grade Applying For <span className="text-red-400">*</span></label>
                                        <select value={form.form_applied_for} onChange={e=>set('form_applied_for',e.target.value)} className={inp}>
                                            <option value="">— Select Form / Grade —</option>
                                            <optgroup label="─── 8-4-4 System ───">
                                                <option value="1">Form 1</option><option value="2">Form 2</option>
                                                <option value="3">Form 3</option><option value="4">Form 4</option>
                                            </optgroup>
                                            <optgroup label="─── CBC System ───">
                                                <option value="10">Grade 10</option><option value="11">Grade 11</option><option value="12">Grade 12</option>
                                            </optgroup>
                                        </select></div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={lbl}>Previous School Name</label>
                                        <input type="text" value={form.previous_school} onChange={e=>set('previous_school',e.target.value)} placeholder="e.g. Nairobi Primary School" className={inp}/></div>
                                    <div><label className={lbl}>Previous School County</label>
                                        <select value={form.previous_school_county} onChange={e=>set('previous_school_county',e.target.value)} className={inp}>
                                            <option value="">— Select County —</option>
                                            {KENYAN_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
                                        </select></div>
                                </div>

                                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                                    <p className="text-xs font-black text-teal-700 mb-3 flex items-center gap-1.5"><FiFileText size={12}/> KCPE / KPSEA Examination Details</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div><label className={lbl}>KCPE Index Number <span className="text-red-400">*</span></label>
                                            <input type="text" value={form.kcpe_index_number} onChange={e=>set('kcpe_index_number',e.target.value)} placeholder="11–12 digits" className={inp}/></div>
                                        <div><label className={lbl}>KCPE Total Marks <span className="text-gray-300">(100–500)</span></label>
                                            <div className="relative">
                                                <input type="number" min={100} max={500} value={form.kcpe_total_marks} onChange={e=>set('kcpe_total_marks',e.target.value)} placeholder="e.g. 380" className={inp}/>
                                                {kcpeRating&&<span className="absolute right-3 top-3.5 text-[10px] font-black text-teal-600">{kcpeRating}</span>}
                                            </div></div>
                                        <div><label className={lbl}>Year of Examination</label>
                                            <select value={form.kcpe_year} onChange={e=>set('kcpe_year',e.target.value)} className={inp}>
                                                {[0,1,2,3,4].map(i=>{const y=new Date().getFullYear()-i;return<option key={y} value={y}>{y}</option>;})}
                                            </select></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ STEP 3: GUARDIAN & EMERGENCY ═════════════ */}
                        {step===3&&(
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}><FiPhone size={18}/></div>
                                    <div><h2 className="text-lg font-extrabold text-gray-800">Parent / Guardian Details</h2><p className="text-xs text-gray-400">Guardian information and emergency contact</p></div>
                                </div>

                                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 space-y-4">
                                    <p className="text-xs font-black text-indigo-700">👪 Parent / Guardian Information</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className={lbl}>Full Name <span className="text-red-400">*</span></label>
                                            <input type="text" value={form.guardian_full_name} onChange={e=>set('guardian_full_name',e.target.value)} placeholder="e.g. Jane Kamau Mwangi" className={inp}/></div>
                                        <div><label className={lbl}>Relationship to Student <span className="text-red-400">*</span></label>
                                            <select value={form.guardian_relationship} onChange={e=>set('guardian_relationship',e.target.value)} className={inp}>
                                                {['Parent','Mother','Father','Guardian','Uncle','Aunt','Grandparent','Sibling','Sponsor','Other'].map(r=><option key={r} value={r}>{r}</option>)}
                                            </select></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className={lbl}>Primary Phone <span className="text-red-400">*</span></label>
                                            <div className="relative"><span className="absolute left-4 top-3.5 text-sm">🇰🇪</span>
                                                <input type="tel" value={form.guardian_phone} onChange={e=>{set('guardian_phone',e.target.value);setOtpSent(false);setOtpVerified(false);setVerToken('');}}
                                                    placeholder="0712 345 678" className={`${inp} pl-10`} autoComplete="tel"/></div>
                                            <p className="text-[11px] text-amber-600 mt-1 ml-1 font-medium">⚠️ Phone used for verification</p></div>
                                        <div><label className={lbl}>Alternative Phone</label>
                                            <input type="tel" value={form.guardian_alt_phone} onChange={e=>set('guardian_alt_phone',e.target.value)} placeholder="Optional 2nd number" className={inp}/></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className={lbl}>Email Address <span className="text-red-400">*</span> <span className="text-gray-400 normal-case font-normal">(OTP sent here)</span></label>
                                            <div className="relative"><FiMail className="absolute left-4 top-3.5 text-gray-400" size={14}/>
                                                <input type="email" value={form.guardian_email} onChange={e=>set('guardian_email',e.target.value)} placeholder="parent@gmail.com" className={`${inp} pl-10`}/></div></div>
                                        <div><label className={lbl}>National ID / Passport <span className="text-red-400">*</span></label>
                                            <input type="text" value={form.guardian_national_id} onChange={e=>set('guardian_national_id',e.target.value)} placeholder="7–8 digit ID" className={inp}/></div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className={lbl}>Occupation / Employer</label>
                                            <input type="text" value={form.guardian_occupation} onChange={e=>set('guardian_occupation',e.target.value)} placeholder="e.g. Teacher, Farmer, Business" className={inp}/></div>
                                        <div><label className={lbl}>Guardian County</label>
                                            <select value={form.guardian_county} onChange={e=>set('guardian_county',e.target.value)} className={inp}>
                                                <option value="">— Select County —</option>
                                                {KENYAN_COUNTIES.map(c=><option key={c} value={c}>{c}</option>)}
                                            </select></div>
                                    </div>
                                </div>

                                <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-4">
                                    <p className="text-xs font-black text-red-700">🆘 Emergency Contact <span className="text-red-400 font-normal">(different from guardian above)</span></p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div><label className={lbl}>Contact Name</label>
                                            <input type="text" value={form.emergency_name} onChange={e=>set('emergency_name',e.target.value)} placeholder="Full name" className={inp}/></div>
                                        <div><label className={lbl}>Emergency Phone</label>
                                            <input type="tel" value={form.emergency_phone} onChange={e=>set('emergency_phone',e.target.value)} placeholder="0700 000 000" className={inp}/></div>
                                        <div><label className={lbl}>Relationship</label>
                                            <select value={form.emergency_relationship} onChange={e=>set('emergency_relationship',e.target.value)} className={inp}>
                                                <option value="">— Select —</option>
                                                {['Parent','Guardian','Uncle','Aunt','Sibling','Grandparent','Family Friend','Other'].map(r=><option key={r} value={r}>{r}</option>)}
                                            </select></div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══ STEP 4: MEDICAL ═══════════════════════════ */}
                        {step===4&&(
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#dc2626,#ef4444)'}}><FiHeart size={18}/></div>
                                    <div><h2 className="text-lg font-extrabold text-gray-800">Medical Information</h2><p className="text-xs text-gray-400">Helps the school provide appropriate care</p></div>
                                </div>

                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800 flex items-start gap-2">
                                    <FiInfo size={13} className="text-blue-500 flex-shrink-0 mt-0.5"/>
                                    This information is kept strictly confidential and used only for student welfare purposes.
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className={lbl}>Blood Group</label>
                                        <select value={form.blood_group} onChange={e=>set('blood_group',e.target.value)} className={inp}>
                                            <option value="">— Not Known / Select —</option>
                                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b} value={b}>{b}</option>)}
                                        </select></div>
                                </div>

                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <label className="text-xs font-black text-amber-700">Does the student have any disability or special needs?</label>
                                        <div className="flex gap-2 ml-auto">
                                            <button type="button" onClick={()=>set('has_disability',true)}
                                                className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${form.has_disability?'bg-amber-600 text-white border-amber-600':'bg-white text-gray-500 border-gray-200'}`}>Yes</button>
                                            <button type="button" onClick={()=>set('has_disability',false)}
                                                className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${!form.has_disability?'bg-gray-700 text-white border-gray-700':'bg-white text-gray-500 border-gray-200'}`}>No</button>
                                        </div>
                                    </div>
                                    {form.has_disability&&(
                                        <div><label className={lbl}>Please describe the disability / special need</label>
                                            <textarea value={form.disability_details} onChange={e=>set('disability_details',e.target.value)} rows={3}
                                                className="w-full px-4 py-3 border-2 border-amber-200 rounded-2xl text-sm outline-none focus:border-amber-400 resize-none bg-white"
                                                placeholder="Describe the condition and any special accommodations needed…"/></div>
                                    )}
                                </div>

                                <div><label className={lbl}>Known Allergies <span className="text-gray-300">(food, medication, environment)</span></label>
                                    <textarea value={form.allergies} onChange={e=>set('allergies',e.target.value)} rows={2}
                                        className={`${inp} !rounded-2xl resize-none`} placeholder="e.g. Penicillin, Peanuts, Dust — or leave blank if none"/></div>

                                <div><label className={lbl}>Other Medical Conditions / Notes</label>
                                    <textarea value={form.medical_conditions} onChange={e=>set('medical_conditions',e.target.value)} rows={2}
                                        className={`${inp} !rounded-2xl resize-none`} placeholder="e.g. Asthma, Diabetes, Epilepsy — or leave blank if none"/></div>
                            </div>
                        )}

                        {/* ══ STEP 5: DOCUMENTS ════════════════════════ */}
                        {step===5&&(
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#7c3aed,#a855f7)'}}><FiUpload size={18}/></div>
                                    <div><h2 className="text-lg font-extrabold text-gray-800">Document Uploads</h2><p className="text-xs text-gray-400">Upload clear scans or photos of required documents</p></div>
                                </div>

                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-800 flex items-start gap-2">
                                    <FiInfo size={13} className="text-purple-500 flex-shrink-0 mt-0.5"/>
                                    Documents can also be physically submitted when the student reports. Uploads here speed up processing.
                                </div>

                                <div className="space-y-3">
                                    <DocUpload label="Student Passport Photo" icon="📸" accept="image/*" onUpload={setPhotoUrl} uploaded={photoUrl}/>
                                    <DocUpload label="Birth Certificate" icon="📜" accept="application/pdf,image/*" onUpload={setBirthCertUrl} uploaded={birthCertUrl}/>
                                    <DocUpload label="KCPE Result Slip / Certificate" icon="🏆" accept="application/pdf,image/*" onUpload={setKcpeSlipUrl} uploaded={kcpeSlipUrl}/>
                                    <DocUpload label="Other Document (Medical Report, Transfer Letter, etc.)" icon="📎" accept="application/pdf,image/*" onUpload={setOtherDocUrl} uploaded={otherDocUrl}/>
                                </div>

                                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-500">
                                    <p className="font-bold text-gray-600 mb-1">Required documents to bring on Reporting Day:</p>
                                    <ul className="space-y-1 list-disc list-inside">
                                        <li>Original Birth Certificate</li>
                                        <li>Original KCPE/KPSEA Certificate</li>
                                        <li>4 Passport-size photos</li>
                                        <li>Transfer/Leaving Certificate from previous school</li>
                                        <li>Medical report (if applicable)</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* ══ STEP 6: VERIFY EMAIL ═════════════════════ */}
                        {step===6&&(
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}><FiLock size={18}/></div>
                                    <div><h2 className="text-lg font-extrabold text-gray-800">Verify Guardian Email</h2><p className="text-xs text-gray-400">A 6-digit code will be sent to your email</p></div>
                                </div>

                                {otpVerified?(
                                    <div className="text-center py-8">
                                        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl" style={{background:'linear-gradient(135deg,#15803d,#22c55e)'}}>
                                            <FiCheckCircle size={40} className="text-white"/>
                                        </div>
                                        <h3 className="text-xl font-extrabold text-green-700 mb-1">Email Verified! ✅</h3>
                                        <p className="text-sm text-gray-500">{form.guardian_email} is confirmed.</p>
                                        <p className="text-xs text-gray-400 mt-2">Click Continue to review and submit your application.</p>
                                    </div>
                                ):(
                                    <>
                                        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 text-center">
                                            <p className="text-xs text-gray-500 mb-1">Verification code will be sent to</p>
                                            <p className="text-base font-black text-sky-700">{form.guardian_email||'— (go back to enter email)'}</p>
                                            <button onClick={()=>setStep(3)} className="text-xs text-sky-500 underline mt-1 hover:text-sky-700">Wrong email? Go back</button>
                                        </div>

                                        {!form.guardian_email.trim()&&(
                                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                                                <p className="text-xs text-amber-700 font-semibold">⚠️ Please go back to Step 3 and enter the guardian email address.</p>
                                            </div>
                                        )}

                                        {!otpSent?(
                                            <button onClick={sendOTP} disabled={sendingOtp||!form.guardian_email.trim()}
                                                className="w-full py-4 text-white font-extrabold rounded-2xl flex items-center justify-center gap-3 text-base disabled:opacity-60 shadow-lg hover:opacity-90 transition"
                                                style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}>
                                                {sendingOtp?<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending…</>:<>✉️ Send Verification Code</>}
                                            </button>
                                        ):(
                                            <div className="space-y-4">
                                                <p className="text-center text-sm font-semibold text-gray-700 mb-1">Enter the 6-digit code sent to your email</p>
                                                <p className="text-center text-xs text-gray-400 mb-4">Check inbox and spam folder. Code expires in 5 minutes.</p>
                                                <OtpInput value={otpCode} onChange={setOtpCode} disabled={verifyingOtp}/>
                                                {otpAttempts>0&&(
                                                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                                                        <FiAlertCircle className="text-red-500 flex-shrink-0" size={14}/>
                                                        <p className="text-xs text-red-700 font-medium">Incorrect code. {5-otpAttempts} attempt(s) remaining.</p>
                                                    </div>
                                                )}
                                                <button onClick={verifyOTP} disabled={otpCode.length<6||verifyingOtp||otpAttempts>=5}
                                                    className="w-full py-3.5 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg transition hover:opacity-90"
                                                    style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}>
                                                    {verifyingOtp?<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Verifying…</>:<><FiCheckCircle size={16}/>Verify Code</>}
                                                </button>
                                                <div className="text-center">
                                                    {countdown>0?(
                                                        <p className="text-xs text-gray-400 flex items-center justify-center gap-1"><FiClock size={11}/>Resend in {countdown}s</p>
                                                    ):(
                                                        <button onClick={sendOTP} disabled={sendingOtp} className="text-xs text-teal-600 font-bold underline hover:text-teal-800 flex items-center gap-1 mx-auto disabled:opacity-50">
                                                            <FiRefreshCw size={11}/>{sendingOtp?'Sending…':'Resend Code'}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* ══ STEP 7: REVIEW & SUBMIT ══════════════════ */}
                        {step===7&&(
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-md" style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}><FiCheckCircle size={18}/></div>
                                    <div><h2 className="text-lg font-extrabold text-gray-800">Review & Submit</h2><p className="text-xs text-gray-400">Check all details carefully before submitting</p></div>
                                </div>

                                {/* Student */}
                                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-black text-teal-700 uppercase">🎓 Student Details</p>
                                        <button onClick={()=>setStep(1)} className="text-[10px] text-teal-600 underline font-bold">Edit</button>
                                    </div>
                                    <ReviewRow label="Full Name" value={[form.student_first_name,form.student_middle_name,form.student_last_name].filter(Boolean).join(' ')}/>
                                    <ReviewRow label="Date of Birth" value={form.date_of_birth?new Date(form.date_of_birth).toLocaleDateString('en-KE',{day:'numeric',month:'long',year:'numeric'}):'—'}/>
                                    <ReviewRow label="Gender" value={form.gender}/>
                                    <ReviewRow label="Nationality" value={form.nationality}/>
                                    <ReviewRow label="County" value={form.county}/>
                                    <ReviewRow label="Sub-County" value={form.sub_county}/>
                                    <ReviewRow label="Village/Estate" value={form.village_estate}/>
                                </div>

                                {/* Academic */}
                                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-black text-blue-700 uppercase">📚 Academic Details</p>
                                        <button onClick={()=>setStep(2)} className="text-[10px] text-blue-600 underline font-bold">Edit</button>
                                    </div>
                                    <ReviewRow label="Form Applied For" value={form.form_applied_for?formLabel(form.form_applied_for):'—'}/>
                                    <ReviewRow label="Previous School" value={form.previous_school}/>
                                    <ReviewRow label="KCPE Index No." value={form.kcpe_index_number}/>
                                    <ReviewRow label="KCPE Marks" value={form.kcpe_total_marks?`${form.kcpe_total_marks}/500`:undefined}/>
                                    <ReviewRow label="KCPE Year" value={form.kcpe_year}/>
                                </div>

                                {/* Guardian */}
                                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-black text-indigo-700 uppercase">👪 Guardian Details</p>
                                        <button onClick={()=>setStep(3)} className="text-[10px] text-indigo-600 underline font-bold">Edit</button>
                                    </div>
                                    <ReviewRow label="Guardian Name" value={form.guardian_full_name}/>
                                    <ReviewRow label="Relationship" value={form.guardian_relationship}/>
                                    <ReviewRow label="Primary Phone ✅" value={form.guardian_phone}/>
                                    <ReviewRow label="Alt Phone" value={form.guardian_alt_phone}/>
                                    <ReviewRow label="Email ✅" value={form.guardian_email}/>
                                    <ReviewRow label="National ID" value={form.guardian_national_id}/>
                                    <ReviewRow label="Occupation" value={form.guardian_occupation}/>
                                    <ReviewRow label="Emergency Contact" value={form.emergency_name?`${form.emergency_name} (${form.emergency_relationship}) — ${form.emergency_phone}`:undefined}/>
                                </div>

                                {/* Medical */}
                                <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-black text-red-700 uppercase">🏥 Medical Info</p>
                                        <button onClick={()=>setStep(4)} className="text-[10px] text-red-600 underline font-bold">Edit</button>
                                    </div>
                                    <ReviewRow label="Blood Group" value={form.blood_group}/>
                                    <ReviewRow label="Disability" value={form.has_disability?`Yes — ${form.disability_details||'Details not specified'}`:'None'}/>
                                    <ReviewRow label="Allergies" value={form.allergies||'None'}/>
                                    <ReviewRow label="Medical Conditions" value={form.medical_conditions||'None'}/>
                                </div>

                                {/* Documents */}
                                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs font-black text-purple-700 uppercase">📄 Uploaded Documents</p>
                                        <button onClick={()=>setStep(5)} className="text-[10px] text-purple-600 underline font-bold">Edit</button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        {[['📸 Passport Photo',photoUrl],['📜 Birth Certificate',birthCertUrl],['🏆 KCPE Slip',kcpeSlipUrl],['📎 Other Doc',otherDocUrl]].map(([l,u])=>(
                                            <div key={l as string} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg ${u?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
                                                <span>{u?'✅':'⬜'}</span><span className="font-semibold">{l}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Honeypot */}
                                <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{display:'none'}}/>

                                {/* Declaration */}
                                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input type="checkbox" checked={termsAgreed} onChange={e=>setTerms(e.target.checked)} className="mt-1 w-5 h-5 rounded accent-teal-600 flex-shrink-0"/>
                                        <div>
                                            <p className="text-xs font-black text-amber-800 mb-1">📋 Declaration & Agreement</p>
                                            <p className="text-xs text-amber-700 leading-relaxed">
                                                I declare that all information provided in this application is <strong>true, accurate and complete</strong> to the best of my knowledge. 
                                                I understand that providing false information may result in immediate cancellation of the application or admission. 
                                                I agree to provide original documents as required on reporting day.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* ── Navigation Buttons ─────────────────────── */}
                        <div className={`flex gap-3 mt-6 ${step>1?'justify-between':'justify-end'}`}>
                            {step>1&&(
                                <button onClick={prevStep} className="flex items-center gap-2 px-5 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition text-sm">
                                    <FiChevronLeft size={16}/> Back
                                </button>
                            )}
                            {step<7&&(
                                <button onClick={nextStep} className="flex items-center gap-2 px-6 py-3 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition text-sm"
                                    style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}>
                                    Continue <FiChevronRight size={16}/>
                                </button>
                            )}
                            {step===7&&(
                                <button onClick={handleSubmit} disabled={submitting||!termsAgreed}
                                    className="flex items-center gap-2 px-8 py-3 text-white font-black rounded-2xl shadow-xl disabled:opacity-60 hover:opacity-90 transition text-base"
                                    style={{background:'linear-gradient(135deg,#0f766e,#0891b2)'}}>
                                    {submitting?<><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting…</>:<>🎓 Submit Application</>}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

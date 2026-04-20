'use client';
import { FiX, FiSave } from 'react-icons/fi';
const G={red:'linear-gradient(135deg,#ef4444,#dc2626)',green:'linear-gradient(135deg,#059669,#0d9488)',amber:'linear-gradient(135deg,#f59e0b,#d97706)',blue:'linear-gradient(135deg,#2563eb,#3b82f6)'};
const hdr=(grad:string,title:string,onClose:()=>any)=><div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{background:grad}}><div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/><h2 className="text-lg font-bold text-white">{title}</h2><button onClick={onClose} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30"><FiX size={18}/></button></div>;
const ftr=(onClose:()=>any,onSave:()=>any,saving:boolean,grad:string)=><div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50"><button onClick={onClose} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14}/> Cancel</button><button onClick={onSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md" style={{background:grad}}>{saving?<div className="spinner" style={{width:14,height:14}}/>:<FiSave size={14}/>} Save</button></div>;
const lb=(l:string)=><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">{l}</label>;
const inp=(v:string,onChange:(v:string)=>void,type='text')=><input type={type} value={v} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"/>;
const sel=(v:any,onChange:(v:string)=>void,opts:any[])=><select value={v} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400"><option value="">-</option>{opts.map((o:any)=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}</select>;
const ta=(v:string,onChange:(v:string)=>void,rows=2)=><textarea value={v} onChange={e=>onChange(e.target.value)} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-gray-400" rows={rows}/>;

export function RecordModal({show,saving,onClose,onSave,form,setForm,students}:any){
  if(!show)return null;
  const s:(f:any)=>void=setForm;
  return(<div className="modal-overlay" onClick={onClose}><div className="modal-content" style={{maxWidth:640}} onClick={(e:any)=>e.stopPropagation()}>
    {hdr(G.red,'Health Record',onClose)}
    <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
      <div className="grid grid-cols-2 gap-4">
        <div>{lb('Blood Group')}{sel(form.blood_group,(v:string)=>s({...form,blood_group:v}),[{v:'A+',l:'A+'},{v:'A-',l:'A-'},{v:'B+',l:'B+'},{v:'B-',l:'B-'},{v:'AB+',l:'AB+'},{v:'AB-',l:'AB-'},{v:'O+',l:'O+'},{v:'O-',l:'O-'}])}</div>
        <div>{lb('Genotype')}{sel(form.genotype,(v:string)=>s({...form,genotype:v}),['AA','AS','SS','AC','SC','CC'])}</div>
        <div>{lb('Height (cm)')}{inp(form.height_cm,(v:string)=>s({...form,height_cm:v}),'number')}</div>
        <div>{lb('Weight (kg)')}{inp(form.weight_kg,(v:string)=>s({...form,weight_kg:v}),'number')}</div>
      </div>
      <div>{lb('Chronic Conditions')}{ta(form.chronic_conditions,(v:string)=>s({...form,chronic_conditions:v}))}</div>
      <div>{lb('Known Allergies')}{ta(form.allergies_text,(v:string)=>s({...form,allergies_text:v}))}</div>
      <div>{lb('Current Medications')}{ta(form.current_medications,(v:string)=>s({...form,current_medications:v}))}</div>
      <div>{lb('Disability / Special Needs')}{ta(form.disability_notes,(v:string)=>s({...form,disability_notes:v}))}</div>
    </div>
    {ftr(onClose,onSave,saving,G.red)}
  </div></div>);
}

export function VisitModal({show,saving,onClose,onSave,form,setForm,students}:any){
  if(!show)return null;
  const s:(f:any)=>void=setForm;
  return(<div className="modal-overlay" onClick={onClose}><div className="modal-content" style={{maxWidth:600}} onClick={(e:any)=>e.stopPropagation()}>
    {hdr(G.green,'Clinic Visit',onClose)}
    <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
      <div>{lb('Student *')}<select value={form.student_id} onChange={e=>s({...form,student_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"><option value={0}>Select Student</option>{students.map((st:any)=><option key={st.id} value={st.id}>{st.last_name}, {st.first_name}</option>)}</select></div>
      <div>{lb('Complaint *')}{ta(form.complaint,(v:string)=>s({...form,complaint:v}))}</div>
      <div className="grid grid-cols-2 gap-4">
        <div>{lb('Diagnosis')}{inp(form.diagnosis,(v:string)=>s({...form,diagnosis:v}))}</div>
        <div>{lb('Treatment')}{inp(form.treatment,(v:string)=>s({...form,treatment:v}))}</div>
        <div>{lb('Temperature')}{inp(form.temperature,(v:string)=>s({...form,temperature:v}),'number')}</div>
        <div>{lb('Attended By')}{inp(form.attended_by,(v:string)=>s({...form,attended_by:v}))}</div>
      </div>
      <div>{lb('Notes')}{ta(form.notes,(v:string)=>s({...form,notes:v}))}</div>
    </div>
    {ftr(onClose,onSave,saving,G.green)}
  </div></div>);
}

export function AllergyModal({show,saving,onClose,onSave,form,setForm,students}:any){
  if(!show)return null;
  const s:(f:any)=>void=setForm;
  return(<div className="modal-overlay" onClick={onClose}><div className="modal-content" style={{maxWidth:500}} onClick={(e:any)=>e.stopPropagation()}>
    {hdr(G.amber,'Add Allergy',onClose)}
    <div className="p-6 space-y-4">
      <div>{lb('Student *')}<select value={form.student_id} onChange={e=>s({...form,student_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"><option value={0}>Select</option>{students.map((st:any)=><option key={st.id} value={st.id}>{st.last_name}, {st.first_name}</option>)}</select></div>
      <div>{lb('Allergen *')}{inp(form.allergen,(v:string)=>s({...form,allergen:v}))}</div>
      <div>{lb('Severity')}<select value={form.severity} onChange={e=>s({...form,severity:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none">{['mild','moderate','severe','life_threatening'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}</select></div>
      <div>{lb('Reaction')}{inp(form.reaction,(v:string)=>s({...form,reaction:v}))}</div>
    </div>
    {ftr(onClose,onSave,saving,G.amber)}
  </div></div>);
}

export function ContactModal({show,saving,onClose,onSave,form,setForm,students}:any){
  if(!show)return null;
  const s:(f:any)=>void=setForm;
  return(<div className="modal-overlay" onClick={onClose}><div className="modal-content" style={{maxWidth:540}} onClick={(e:any)=>e.stopPropagation()}>
    {hdr(G.blue,'Emergency Contact',onClose)}
    <div className="p-6 space-y-4">
      <div>{lb('Student *')}<select value={form.student_id} onChange={e=>s({...form,student_id:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"><option value={0}>Select</option>{students.map((st:any)=><option key={st.id} value={st.id}>{st.last_name}, {st.first_name}</option>)}</select></div>
      <div className="grid grid-cols-2 gap-4">
        <div>{lb('Contact Name *')}{inp(form.contact_name,(v:string)=>s({...form,contact_name:v}))}</div>
        <div>{lb('Relationship')}<select value={form.relationship} onChange={e=>s({...form,relationship:e.target.value})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none"><option value="">-</option>{['Father','Mother','Guardian','Uncle','Aunt','Sibling','Sponsor','Other'].map(r=><option key={r} value={r}>{r}</option>)}</select></div>
        <div>{lb('Phone *')}{inp(form.phone,(v:string)=>s({...form,phone:v}))}</div>
        <div>{lb('Alt Phone')}{inp(form.alt_phone,(v:string)=>s({...form,alt_phone:v}))}</div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>{lb('Escalation Order')}<input type="number" value={form.escalation_order} onChange={e=>s({...form,escalation_order:Number(e.target.value)})} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none" min={1} max={10}/></div>
        <div className="flex flex-col gap-2 pt-5"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_primary} onChange={e=>s({...form,is_primary:e.target.checked})} className="w-4 h-4 rounded"/><span className="text-sm text-gray-700">Primary Contact</span></label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.can_authorize_treatment} onChange={e=>s({...form,can_authorize_treatment:e.target.checked})} className="w-4 h-4 rounded"/><span className="text-sm text-gray-700">Can Authorize Treatment</span></label></div>
      </div>
    </div>
    {ftr(onClose,onSave,saving,G.blue)}
  </div></div>);
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiUpload, FiImage, FiFile, FiTrash2, FiSearch, FiRefreshCw, FiDownload, FiPlus, FiX, FiEye, FiCheck, FiFilter } from 'react-icons/fi';

type EvidenceType = 'photo' | 'scan' | 'document' | 'video' | 'link';
const EVID_CFG: Record<EvidenceType, { label: string; color: string; bg: string; border: string; emoji: string }> = {
  photo:    { label: 'Photo',     color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', emoji: '📷' },
  scan:     { label: 'Scan/PDF',  color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', emoji: '📄' },
  document: { label: 'Document',  color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', emoji: '📝' },
  video:    { label: 'Video',     color: '#d97706', bg: '#fffbeb', border: '#fde68a', emoji: '🎬' },
  link:     { label: 'URL Link',  color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', emoji: '🔗' },
};

interface Evidence {
  id?: number;
  student_id: number;
  task_id?: number;
  subject_id: number;
  term_id?: number;
  evidence_type: EvidenceType;
  file_url: string;
  file_name: string;
  description: string;
  task_number?: number;
  verified?: boolean;
  verified_by?: string;
  created_at?: string;
}

function UploadModal({ onClose, onSave, students, subjects, terms }: any) {
  const [f, setF] = useState<Partial<Evidence>>({ evidence_type:'photo', file_url:'', file_name:'', description:'', task_number:1, verified:false });
  const set = (p: Partial<Evidence>) => setF(prev => ({ ...prev, ...p }));
  const urlPlaceholders: Record<EvidenceType, string> = {
    photo: 'https://your-storage.supabase.co/evidence/photo.jpg',
    scan: 'https://your-storage.supabase.co/evidence/scan.pdf',
    document: 'https://your-storage.supabase.co/evidence/document.docx',
    video: 'https://your-storage.supabase.co/evidence/video.mp4',
    link: 'https://drive.google.com/file/d/...',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.6)', backdropFilter:'blur(6px)' }}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiUpload size={18} className="text-white" /></div>
            <div><h3 className="font-bold text-gray-900 text-sm">Upload SBA Evidence</h3><p className="text-xs text-gray-400">Attach evidence to student SBA task</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><FiX size={14} /></button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Evidence type */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Evidence Type *</label>
            <div className="grid grid-cols-5 gap-2">
              {(Object.entries(EVID_CFG) as [EvidenceType, any][]).map(([key, cfg]) => (
                <button key={key} onClick={() => set({ evidence_type: key })}
                  className="p-2.5 rounded-xl border-2 text-center transition-all"
                  style={f.evidence_type===key?{borderColor:cfg.color,background:cfg.bg}:{borderColor:'#e5e7eb',background:'#f9fafb'}}>
                  <p className="text-base mb-0.5">{cfg.emoji}</p>
                  <p className="text-[9px] font-bold" style={{ color:f.evidence_type===key?cfg.color:'#6b7280' }}>{cfg.label}</p>
                </button>
              ))}
            </div>
          </div>
          {/* Student + Subject */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Student *</label>
              <select value={f.student_id||''} onChange={e=>set({student_id:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                <option value="">Select student…</option>
                {students.map((s:any)=><option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.admission_no})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject / Learning Area *</label>
              <select value={f.subject_id||''} onChange={e=>set({subject_id:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                <option value="">Select subject…</option>
                {subjects.map((s:any)=><option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
          </div>
          {/* Term + Task */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Term</label>
              <select value={f.term_id||''} onChange={e=>set({term_id:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                <option value="">Select term…</option>
                {terms.map((t:any)=><option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">SBA Task #</label>
              <select value={f.task_number||1} onChange={e=>set({task_number:Number(e.target.value)})} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50">
                {[1,2,3,4,5].map(n=><option key={n} value={n}>Task {n}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer pb-1.5">
                <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${f.verified?'bg-green-500 border-green-500':'border-gray-200 bg-gray-50'}`} onClick={()=>set({verified:!f.verified})}>
                  {f.verified && <FiCheck size={11} className="text-white" />}
                </div>
                <span className="text-[10px] font-bold text-gray-600">Verified by HOD</span>
              </label>
            </div>
          </div>
          {/* File URL */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">File URL / Link *</label>
            <input value={f.file_url||''} onChange={e=>set({file_url:e.target.value})} placeholder={urlPlaceholders[f.evidence_type||'photo']} className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-gray-50" />
            <p className="text-[9px] text-gray-400 mt-1">Paste the Supabase Storage URL, Google Drive link, or any accessible file URL</p>
          </div>
          {/* File name */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">File Name / Label *</label>
            <input value={f.file_name||''} onChange={e=>set({file_name:e.target.value})} placeholder="e.g. John_Doe_Math_Task1_Portfolio.pdf" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50" />
          </div>
          {/* Description */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
            <textarea value={f.description||''} onChange={e=>set({description:e.target.value})} rows={2} placeholder="Brief description of the evidence and what it demonstrates…" className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-xl focus:outline-none bg-gray-50 resize-none" />
          </div>
          {/* Preview if image/video */}
          {f.file_url && (f.evidence_type==='photo') && (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <img src={f.file_url} alt="Preview" className="w-full max-h-48 object-cover" onError={e=>(e.target as any).style.display='none'} />
            </div>
          )}
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
          <button onClick={()=>{
            if(!f.student_id||!f.subject_id||!f.file_url?.trim()||!f.file_name?.trim()){toast.error('Fill all required fields');return;}
            onSave(f);
          }} className="px-5 py-2 text-sm font-bold text-white rounded-xl shadow-md active:scale-95 flex items-center gap-2" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
            <FiUpload size={13} /> Upload Evidence
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SBAEvidencePage() {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTask, setFilterTask] = useState('');
  const [filterVerified, setFilterVerified] = useState('all');
  const [searchQ, setSearchQ] = useState('');
  const [viewImg, setViewImg] = useState<string|null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [eR, sR, subR, fR, tR] = await Promise.all([
      supabase.from('sba_evidence').select('*').order('created_at', { ascending: false }),
      supabase.from('school_students').select('*').order('last_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_terms').select('*').order('year', { ascending: false }),
    ]);
    if (!eR.error) setEvidence(eR.data || []);
    setStudents(sR.data||[]); setSubjects(subR.data||[]); setForms(fR.data||[]); setTerms(tR.data||[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => evidence.filter(e => {
    if (filterSubject && String(e.subject_id) !== filterSubject) return false;
    if (filterTask && String(e.task_number) !== filterTask) return false;
    if (filterVerified === 'yes' && !e.verified) return false;
    if (filterVerified === 'no' && e.verified) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const stu = students.find(s => s.id === e.student_id);
      const name = stu ? `${stu.first_name} ${stu.last_name}`.toLowerCase() : '';
      if (!name.includes(q) && !(e.file_name||'').toLowerCase().includes(q) && !(e.description||'').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [evidence, filterSubject, filterTask, filterVerified, searchQ, students]);

  const stats = useMemo(() => ({
    total: evidence.length,
    verified: evidence.filter(e => e.verified).length,
    byType: Object.fromEntries(Object.keys(EVID_CFG).map(k => [k, evidence.filter(e => e.evidence_type === k).length])),
    uniqueStudents: new Set(evidence.map(e => e.student_id)).size,
  }), [evidence]);

  const handleSave = async (data: Partial<Evidence>) => {
    const tid = toast.loading('Uploading evidence…');
    try {
      const { error } = await supabase.from('sba_evidence').insert({ ...data, created_at: new Date().toISOString() });
      if (error) throw error;
      toast.success('Evidence uploaded!', { id: tid });
      setShowModal(false); fetchAll();
    } catch (e: any) { toast.error(e.message || 'Failed', { id: tid }); }
  };

  const handleVerify = async (id: number, verified: boolean) => {
    const { error } = await supabase.from('sba_evidence').update({ verified, verified_by: 'HOD' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success(verified ? '✅ Verified' : 'Unverified'); fetchAll();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this evidence record?')) return;
    await supabase.from('sba_evidence').delete().eq('id', id);
    toast.success('Deleted'); fetchAll();
  };

  const exportCSV = () => {
    const rows = [['Student','Admission No','Subject','Task #','Type','File Name','URL','Description','Verified','Date'],
      ...evidence.map(e => {
        const stu = students.find(s => s.id === e.student_id);
        const sub = subjects.find(s => s.id === e.subject_id);
        return [stu?`${stu.first_name} ${stu.last_name}`:'',stu?.admission_no||'',sub?.subject_name||'',`Task ${e.task_number}`,EVID_CFG[e.evidence_type]?.label||e.evidence_type,e.file_name,e.file_url,e.description,e.verified?'Yes':'No',e.created_at?.slice(0,10)||''];
      })];
    const blob = new Blob([rows.map(r=>r.map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`sba-evidence-${new Date().toISOString().slice(0,10)}.csv`;a.click();
    toast.success('Exported');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiUpload size={24} className="text-white" /></div>
        <div className="w-8 h-8 border-gray-200 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth:3,borderStyle:'solid' }} />
        <p className="text-gray-400 text-sm">Loading SBA Evidence…</p>
      </div>
    </div>
  );

  return (
    <>
      {showModal && <UploadModal onClose={()=>setShowModal(false)} onSave={handleSave} students={students} subjects={subjects} terms={terms} />}
      {viewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background:'rgba(0,0,0,0.85)' }} onClick={()=>setViewImg(null)}>
          <img src={viewImg} alt="Evidence" className="max-w-2xl max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
        </div>
      )}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}><FiUpload size={22} className="text-white" /></div>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900">SBA Evidence File Upload</h1>
              <p className="text-sm text-gray-500 mt-0.5">Photos · Scans · Documents · Per Student · Per SBA Task · HOD Verification</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAll} className="w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm"><FiRefreshCw size={15} /></button>
            <button onClick={exportCSV} className="px-3 py-2 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-2 shadow-sm hover:bg-gray-50"><FiDownload size={14} /> CSV</button>
            <button onClick={()=>setShowModal(true)} className="px-4 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              <FiPlus size={14} /> Upload Evidence
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label:'Total Evidence', value:stats.total, sub:'Files uploaded', color:'#0891b2', emoji:'📁' },
            { label:'Verified', value:stats.verified, sub:'HOD approved', color:'#059669', emoji:'✅' },
            { label:'Unverified', value:stats.total-stats.verified, sub:'Pending review', color:'#d97706', emoji:'⏳' },
            { label:'Students', value:stats.uniqueStudents, sub:'With evidence', color:'#7c3aed', emoji:'👨‍🎓' },
          ].map(({ label, value, sub, color, emoji }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between mb-2"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p><span className="text-2xl">{emoji}</span></div>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-500 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Type breakdown */}
        <div className="grid grid-cols-5 gap-3">
          {(Object.entries(EVID_CFG) as [EvidenceType, any][]).map(([key, cfg]) => (
            <div key={key} className="bg-white rounded-2xl border-2 shadow-sm p-4 text-center" style={{ borderColor:cfg.border }}>
              <p className="text-xl mb-1">{cfg.emoji}</p>
              <p className="text-xl font-black" style={{ color:cfg.color }}>{stats.byType[key]||0}</p>
              <p className="text-[10px] font-bold text-gray-500">{cfg.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Search</label>
              <div className="relative"><FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Student name, file…" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50" /></div></div>
            <div className="min-w-[140px]"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Subject</label>
              <select value={filterSubject} onChange={e=>setFilterSubject(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50"><option value="">All Subjects</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div className="min-w-[110px]"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Task</label>
              <select value={filterTask} onChange={e=>setFilterTask(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50"><option value="">All Tasks</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>Task {n}</option>)}</select></div>
            <div className="min-w-[110px]"><label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Verified</label>
              <select value={filterVerified} onChange={e=>setFilterVerified(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-gray-50/50"><option value="all">All</option><option value="yes">✅ Verified</option><option value="no">⏳ Pending</option></select></div>
            <p className="text-sm text-gray-500 pb-2"><span className="font-bold text-gray-800">{filtered.length}</span> / {evidence.length}</p>
          </div>
        </div>

        {/* Evidence Grid */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center"><FiUpload size={28} className="text-gray-300" /></div>
            <p className="text-gray-400 font-semibold text-sm">No evidence files yet</p>
            <p className="text-xs text-gray-300 mt-1">Upload photos, scans or documents for SBA tasks</p>
            <button onClick={()=>setShowModal(true)} className="mt-4 px-5 py-2.5 text-sm font-bold text-white rounded-xl shadow-md" style={{ background:'linear-gradient(135deg,#0891b2,#0e7490)' }}>
              <FiPlus size={14} className="inline mr-1" /> Upload First Evidence
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(ev => {
              const stu = students.find(s => s.id === ev.student_id);
              const sub = subjects.find(s => s.id === ev.subject_id);
              const cfg = EVID_CFG[ev.evidence_type] || EVID_CFG.document;
              return (
                <div key={ev.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                  {/* Thumbnail area */}
                  {ev.evidence_type === 'photo' ? (
                    <div className="h-36 bg-gray-100 overflow-hidden cursor-pointer relative" onClick={()=>setViewImg(ev.file_url)}>
                      <img src={ev.file_url} alt={ev.file_name} className="w-full h-full object-cover" onError={e=>{(e.target as HTMLImageElement).src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="144"><rect fill="%23f1f5f9" width="400" height="144"/><text x="50%" y="50%" fill="%23cbd5e1" font-size="40" text-anchor="middle" dy=".3em">📷</text></svg>';}} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center"><FiEye size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" /></div>
                    </div>
                  ) : (
                    <div className="h-36 flex items-center justify-center" style={{ background: cfg.bg }}>
                      <div className="text-center"><p className="text-5xl mb-2">{cfg.emoji}</p><p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p></div>
                    </div>
                  )}
                  {/* Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-800 truncate">{stu?`${stu.first_name} ${stu.last_name}`:'Unknown'}</p>
                        <p className="text-[10px] text-gray-500">{sub?.subject_name||'—'} · Task {ev.task_number}</p>
                      </div>
                      {ev.verified ? (
                        <span className="flex items-center gap-1 text-[9px] font-black text-green-700 bg-green-100 px-2 py-0.5 rounded-full border border-green-200 flex-shrink-0"><FiCheck size={9} />Verified</span>
                      ) : (
                        <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200 flex-shrink-0">Pending</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mb-3 line-clamp-2">{ev.description||ev.file_name}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <a href={ev.file_url} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1" style={{ background:cfg.bg, color:cfg.color, borderColor:cfg.border }}><FiEye size={9} /> View</a>
                      {!ev.verified && <button onClick={()=>ev.id&&handleVerify(ev.id,true)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 flex items-center gap-1"><FiCheck size={9} /> Verify</button>}
                      {ev.verified && <button onClick={()=>ev.id&&handleVerify(ev.id,false)} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100">Unverify</button>}
                      <button onClick={()=>ev.id&&handleDelete(ev.id)} className="w-6 h-6 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 ml-auto"><FiTrash2 size={10}/></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

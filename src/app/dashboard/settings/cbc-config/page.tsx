'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiSettings, FiPlus, FiSearch, FiRefreshCw, FiX, FiSave, FiEdit2,
    FiTrash2, FiArrowRight, FiAlertCircle, FiCheckCircle, FiChevronDown,
    FiChevronUp, FiBook, FiLayers, FiGrid, FiToggleLeft, FiToggleRight,
    FiFileText, FiAward, FiBarChart2, FiUsers, FiZap, FiTarget,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface LearningArea { id: string; name: string; code: string; grade_levels: string[]; active: boolean; color: string; strand_count?: number; }
interface Strand { id: string; learning_area_id: string; name: string; code: string; order_no: number; active: boolean; sub_strand_count?: number; }
interface SubStrand { id: string; strand_id: string; name: string; code: string; order_no: number; active: boolean; descriptor_ee?: string; descriptor_me?: string; descriptor_ae?: string; descriptor_be?: string; }

const AREA_COLORS = ['#2563EB','#059669','#D97706','#7C3AED','#DC2626','#0891B2','#9333EA','#65A30D','#EA580C','#DB2777'];
const GRADE_LEVELS = ['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];

const SQL = `CREATE TABLE IF NOT EXISTS school_cbc_learning_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, code text, grade_levels text[],
  active boolean DEFAULT true, color text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_cbc_strands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_area_id uuid REFERENCES school_cbc_learning_areas(id) ON DELETE CASCADE,
  name text NOT NULL, code text, order_no int DEFAULT 1,
  active boolean DEFAULT true
);
CREATE TABLE IF NOT EXISTS school_cbc_sub_strands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strand_id uuid REFERENCES school_cbc_strands(id) ON DELETE CASCADE,
  name text NOT NULL, code text, order_no int DEFAULT 1, active boolean DEFAULT true,
  descriptor_ee text, descriptor_me text, descriptor_ae text, descriptor_be text
);
ALTER TABLE school_cbc_learning_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_cbc_sub_strands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all" ON school_cbc_learning_areas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_cbc_strands FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "all" ON school_cbc_sub_strands FOR ALL USING (true) WITH CHECK (true);`;

const DEMO_AREAS: LearningArea[] = [
    { id:'a1', name:'Mathematics Activities', code:'MA', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#2563EB', strand_count:4 },
    { id:'a2', name:'English', code:'EN', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#059669', strand_count:5 },
    { id:'a3', name:'Kiswahili', code:'KS', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#D97706', strand_count:4 },
    { id:'a4', name:'Integrated Science', code:'IS', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#7C3AED', strand_count:6 },
    { id:'a5', name:'Pre-Technical Studies', code:'PT', grade_levels:['Grade 7','Grade 8'], active:true, color:'#DC2626', strand_count:3 },
    { id:'a6', name:'Social Studies', code:'SS', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#0891B2', strand_count:4 },
    { id:'a7', name:'Business Studies', code:'BS', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#9333EA', strand_count:3 },
    { id:'a8', name:'Agriculture', code:'AG', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#65A30D', strand_count:4 },
    { id:'a9', name:'Creative Arts', code:'CA', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#EA580C', strand_count:3 },
    { id:'a10', name:'ICT', code:'IC', grade_levels:['Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#DB2777', strand_count:5 },
];
const DEMO_STRANDS: Strand[] = [
    { id:'s1', learning_area_id:'a1', name:'Numbers', code:'NUM', order_no:1, active:true, sub_strand_count:5 },
    { id:'s2', learning_area_id:'a1', name:'Algebra', code:'ALG', order_no:2, active:true, sub_strand_count:3 },
    { id:'s3', learning_area_id:'a1', name:'Geometry', code:'GEO', order_no:3, active:true, sub_strand_count:4 },
    { id:'s4', learning_area_id:'a1', name:'Measurement', code:'MEA', order_no:4, active:true, sub_strand_count:3 },
    { id:'s5', learning_area_id:'a2', name:'Listening & Speaking', code:'LS', order_no:1, active:true, sub_strand_count:4 },
    { id:'s6', learning_area_id:'a2', name:'Reading', code:'RD', order_no:2, active:true, sub_strand_count:5 },
    { id:'s7', learning_area_id:'a2', name:'Writing', code:'WR', order_no:3, active:true, sub_strand_count:4 },
];

export default function CBCConfigPage() {
    const [areas, setAreas]       = useState<LearningArea[]>([]);
    const [strands, setStrands]   = useState<Strand[]>([]);
    const [subStrands, setSubStrands] = useState<SubStrand[]>([]);
    const [loading, setLoading]   = useState(true);
    const [dbReady, setDbReady]   = useState(false);
    const [tab, setTab]           = useState<'areas'|'strands'|'substrands'>('areas');
    const [selArea, setSelArea]   = useState<LearningArea|null>(null);
    const [selStrand, setSelStrand] = useState<Strand|null>(null);
    const [search, setSearch]     = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'area'|'strand'|'substrand'>('area');
    const [editItem, setEditItem]  = useState<any>(null);
    const [saving, setSaving]      = useState(false);

    const emptyArea = { name:'', code:'', grade_levels:[] as string[], active:true, color:AREA_COLORS[0] };
    const emptyStrand = { name:'', code:'', order_no:1, active:true };
    const emptySubStrand = { name:'', code:'', order_no:1, active:true, descriptor_ee:'', descriptor_me:'', descriptor_ae:'', descriptor_be:'' };
    const [aForm, setAForm] = useState(emptyArea);
    const [sForm, setSForm] = useState(emptyStrand);
    const [ssForm, setSSForm] = useState(emptySubStrand);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const { error } = await sb.from('school_cbc_learning_areas').select('id').limit(1);
            const ready = !error || error.code !== '42P01';
            setDbReady(ready);
            if (ready) {
                const [aR, sR, ssR] = await Promise.all([
                    sb.from('school_cbc_learning_areas').select('*').order('name'),
                    sb.from('school_cbc_strands').select('*').order('order_no'),
                    sb.from('school_cbc_sub_strands').select('*').order('order_no'),
                ]);
                const areasData = (aR.data || []).map((a:any) => ({
                    ...a,
                    strand_count: (sR.data || []).filter((s:any) => s.learning_area_id === a.id).length,
                }));
                setAreas(areasData);
                const strandsData = (sR.data || []).map((s:any) => ({
                    ...s,
                    sub_strand_count: (ssR.data || []).filter((ss:any) => ss.strand_id === s.id).length,
                }));
                setStrands(strandsData);
                setSubStrands(ssR.data || []);
            } else {
                setAreas(DEMO_AREAS);
                setStrands(DEMO_STRANDS);
            }
        } catch { setAreas(DEMO_AREAS); setStrands(DEMO_STRANDS); }
        setLoading(false);
    }

    const filteredAreas   = useMemo(() => areas.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase())), [areas, search]);
    const areaStrands     = useMemo(() => strands.filter(s => s.learning_area_id === selArea?.id), [strands, selArea]);
    const strandSubStrands= useMemo(() => subStrands.filter(ss => ss.strand_id === selStrand?.id), [subStrands, selStrand]);
    const filteredStrands = useMemo(() => strands.filter(s => (!selArea || s.learning_area_id === selArea.id) && (!search || s.name.toLowerCase().includes(search.toLowerCase()))), [strands, selArea, search]);
    const filteredSubStrands = useMemo(() => subStrands.filter(ss => (!selStrand || ss.strand_id === selStrand.id) && (!search || ss.name.toLowerCase().includes(search.toLowerCase()))), [subStrands, selStrand, search]);

    const stats = { areas: areas.length, activeAreas: areas.filter(a=>a.active).length, strands: strands.length, subStrands: subStrands.length };

    function openModal(type: 'area'|'strand'|'substrand', edit?: any) {
        setModalType(type); setEditItem(edit||null);
        if (type==='area') setAForm(edit ? { name:edit.name, code:edit.code||'', grade_levels:edit.grade_levels||[], active:edit.active, color:edit.color||AREA_COLORS[0] } : emptyArea);
        if (type==='strand') setSForm(edit ? { name:edit.name, code:edit.code||'', order_no:edit.order_no||1, active:edit.active } : emptyStrand);
        if (type==='substrand') setSSForm(edit ? { name:edit.name, code:edit.code||'', order_no:edit.order_no||1, active:edit.active, descriptor_ee:edit.descriptor_ee||'', descriptor_me:edit.descriptor_me||'', descriptor_ae:edit.descriptor_ae||'', descriptor_be:edit.descriptor_be||'' } : emptySubStrand);
        setShowModal(true);
    }

    async function saveArea() {
        if (!aForm.name) { toast.error('Learning area name required'); return; }
        setSaving(true);
        try {
            const payload = { name:aForm.name, code:aForm.code||null, grade_levels:aForm.grade_levels, active:aForm.active, color:aForm.color };
            if (dbReady) {
                if (editItem) { const {error}=await sb.from('school_cbc_learning_areas').update(payload).eq('id',editItem.id); if(error)throw error; setAreas(p=>p.map(a=>a.id===editItem.id?{...a,...payload}:a)); }
                else { const {data,error}=await sb.from('school_cbc_learning_areas').insert(payload).select().single(); if(error)throw error; setAreas(p=>[{...data,strand_count:0},...p]); }
            } else {
                if (editItem) setAreas(p=>p.map(a=>a.id===editItem.id?{...a,...payload}:a));
                else setAreas(p=>[{...payload,id:`demo-${Date.now()}`,strand_count:0},...p]);
            }
            toast.success(editItem?'Updated!':'Learning area created!');
            setShowModal(false); setEditItem(null);
        } catch(e:any){toast.error(e.message);}
        setSaving(false);
    }

    async function saveStrand() {
        if (!sForm.name || !selArea) { toast.error('Strand name and parent learning area required'); return; }
        setSaving(true);
        try {
            const payload = { name:sForm.name, code:sForm.code||null, order_no:sForm.order_no, active:sForm.active, learning_area_id:selArea.id };
            if (dbReady) {
                if (editItem) { const {error}=await sb.from('school_cbc_strands').update(payload).eq('id',editItem.id); if(error)throw error; setStrands(p=>p.map(s=>s.id===editItem.id?{...s,...payload}:s)); }
                else { const {data,error}=await sb.from('school_cbc_strands').insert(payload).select().single(); if(error)throw error; setStrands(p=>[...p,{...data,sub_strand_count:0}]); }
            } else {
                if (editItem) setStrands(p=>p.map(s=>s.id===editItem.id?{...s,...payload}:s));
                else setStrands(p=>[...p,{...payload,id:`demo-${Date.now()}`,sub_strand_count:0}]);
            }
            toast.success(editItem?'Updated!':'Strand created!');
            setShowModal(false); setEditItem(null);
        } catch(e:any){toast.error(e.message);}
        setSaving(false);
    }

    async function saveSubStrand() {
        if (!ssForm.name || !selStrand) { toast.error('Sub-strand name and parent strand required'); return; }
        setSaving(true);
        try {
            const payload = { name:ssForm.name, code:ssForm.code||null, order_no:ssForm.order_no, active:ssForm.active, strand_id:selStrand.id, descriptor_ee:ssForm.descriptor_ee||null, descriptor_me:ssForm.descriptor_me||null, descriptor_ae:ssForm.descriptor_ae||null, descriptor_be:ssForm.descriptor_be||null };
            if (dbReady) {
                if (editItem) { const {error}=await sb.from('school_cbc_sub_strands').update(payload).eq('id',editItem.id); if(error)throw error; setSubStrands(p=>p.map(ss=>ss.id===editItem.id?{...ss,...payload}:ss)); }
                else { const {data,error}=await sb.from('school_cbc_sub_strands').insert(payload).select().single(); if(error)throw error; setSubStrands(p=>[...p,data]); }
            } else {
                if (editItem) setSubStrands(p=>p.map(ss=>ss.id===editItem.id?{...ss,...payload}:ss));
                else setSubStrands(p=>[...p,{...payload,id:`demo-${Date.now()}`}]);
            }
            toast.success(editItem?'Updated!':'Sub-strand created!');
            setShowModal(false); setEditItem(null);
        } catch(e:any){toast.error(e.message);}
        setSaving(false);
    }

    async function del(table:string, id:string, setter:Function) {
        if (!confirm('Delete? This will also remove all child records.')) return;
        if (dbReady) { const {error}=await sb.from(table).delete().eq('id',id); if(error){toast.error(error.message);return;} }
        setter((p:any[])=>p.filter(x=>x.id!==id));
        toast.success('Deleted');
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl animate-pulse" style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}}>
                    <FiSettings size={30} color="#F59E0B"/>
                </div>
                <p className="text-xl font-black text-gray-800">Loading CBC Config…</p>
                <p className="text-sm text-gray-500 mt-1">KICD CBC Curriculum Framework Builder</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen pb-10" style={{background:'linear-gradient(135deg,#f0f4ff 0%,#fff7ed 60%,#f0fdf4 100%)'}}>
            <Toaster position="top-right"/>

            {/* ── HEADER ── */}
            <div className="rounded-2xl overflow-hidden mb-6 shadow-2xl" style={{background:'linear-gradient(135deg,#0F2044 0%,#1E3A5F 50%,#0F2044 100%)'}}>
                <div className="px-6 py-5">
                    <div className="flex items-center gap-2 text-blue-300 text-xs mb-3">
                        <Link href="/dashboard" className="hover:text-white">Dashboard</Link><FiArrowRight size={10}/>
                        <Link href="/dashboard/settings" className="hover:text-white">Settings</Link><FiArrowRight size={10}/>
                        <span className="text-amber-400 font-semibold">⚙️ CBC Config Builder</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}>
                                <FiSettings size={28} color="#fff"/>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-2xl font-black text-white">CBC Subject / Strand Config Builder</h1>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-400 text-purple-900">KICD</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-amber-900">CBC 2024</span>
                                    {!dbReady && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500 text-white">DEMO MODE</span>}
                                </div>
                                <p className="text-blue-200 text-sm mt-0.5">Configure Learning Areas · Strands · Sub-Strands · Competency Descriptors per KICD framework</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {[{href:'/dashboard/exams/cbc-marks/rubric-config',l:'Rubric Config',ic:FiTarget},{href:'/dashboard/exams/cbc-reports',l:'CBC Reports',ic:FiBarChart2},{href:'/dashboard/exams/sba-manager',l:'SBA Manager',ic:FiAward}].map(x=>(
                                <Link key={x.href} href={x.href} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-blue-200 hover:text-white hover:bg-white/10 border border-white/10 transition-all"><x.ic size={12}/>{x.l}</Link>
                            ))}
                            <button onClick={()=>openModal('area')} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-lg" style={{background:'linear-gradient(135deg,#F59E0B,#D97706)'}}>
                                <FiPlus size={15}/>Add Learning Area
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 text-xs">
                        {[['Framework','KICD CBC 2024'],['Levels','EE · ME · AE · BE'],['Hierarchy','Areas → Strands → Sub-Strands'],['Authority','Kenya Institute of Curriculum Dev.']].map(([k,v])=>(
                            <div key={k} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.08)'}}>
                                <span className="text-amber-400 font-bold">{k}:</span><span className="text-blue-200">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-white/10">
                    {[{l:'Learning Areas',v:stats.areas,ic:FiBook,c:'#F59E0B'},{l:'Active Areas',v:stats.activeAreas,ic:FiCheckCircle,c:'#34D399'},{l:'Strands',v:stats.strands,ic:FiLayers,c:'#60A5FA'},{l:'Sub-Strands',v:stats.subStrands,ic:FiGrid,c:'#A78BFA'}].map((s,i)=>(
                        <div key={i} className="px-4 py-3 flex items-center gap-3 border-r border-white/10 last:border-0">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:s.c+'22'}}><s.ic size={14} style={{color:s.c}}/></div>
                            <div><div className="text-xl font-black" style={{color:s.c}}>{s.v}</div><div className="text-[10px] text-blue-300">{s.l}</div></div>
                        </div>
                    ))}
                </div>
            </div>

            {!dbReady && (
                <div className="mb-5 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3">
                    <FiAlertCircle size={20} className="text-amber-600 flex-shrink-0 mt-0.5"/>
                    <div className="flex-1">
                        <p className="font-bold text-amber-800">Demo Mode — CBC config tables not yet created</p>
                        <p className="text-xs text-amber-700 mt-1">Run the SQL below in Supabase SQL Editor to enable live saving.</p>
                        <details className="mt-2"><summary className="cursor-pointer text-xs font-bold text-amber-800 hover:underline">▶ Show Setup SQL</summary>
                            <pre className="mt-2 bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                        </details>
                    </div>
                    <button onClick={load} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-300"><FiRefreshCw size={12}/>Retry</button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex items-center gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm border border-gray-100 w-fit">
                {([['areas','📚 Learning Areas',FiBook],['strands','🔀 Strands',FiLayers],['substrands','🔽 Sub-Strands',FiGrid]] as const).map(([k,l,Ic])=>(
                    <button key={k} onClick={()=>{setTab(k as any);setSearch('');}} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?'text-white shadow-md':'text-gray-500 hover:text-gray-800'}`} style={tab===k?{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}:{}}>
                        <Ic size={13}/>{l}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5">
                <div className="flex flex-col lg:flex-row gap-3 items-center">
                    <div className="relative flex-1"><FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200" placeholder={`Search ${tab}…`} value={search} onChange={e=>setSearch(e.target.value)}/></div>
                    {tab==='strands'&&<select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={selArea?.id||''} onChange={e=>setSelArea(areas.find(a=>a.id===e.target.value)||null)}>
                        <option value="">All Learning Areas</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>}
                    {tab==='substrands'&&<>
                        <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={selArea?.id||''} onChange={e=>{setSelArea(areas.find(a=>a.id===e.target.value)||null);setSelStrand(null);}}>
                            <option value="">All Areas</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <select className="px-3 py-2 rounded-lg border border-gray-200 text-xs bg-white focus:outline-none" value={selStrand?.id||''} onChange={e=>setSelStrand(strands.find(s=>s.id===e.target.value)||null)}>
                            <option value="">All Strands</option>{(selArea?strands.filter(s=>s.learning_area_id===selArea.id):strands).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </>}
                    {tab==='strands'&&<button onClick={()=>{ if(!selArea){toast.error('Select a learning area first');return;} openModal('strand'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}><FiPlus size={14}/>Add Strand</button>}
                    {tab==='substrands'&&<button onClick={()=>{ if(!selStrand){toast.error('Select a strand first');return;} openModal('substrand'); }} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{background:'linear-gradient(135deg,#059669,#10B981)'}}><FiPlus size={14}/>Add Sub-Strand</button>}
                </div>
            </div>

            {/* ── LEARNING AREAS ── */}
            {tab==='areas' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAreas.map(a=>(
                        <div key={a.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all">
                            <div className="h-2" style={{background:a.color}}/>
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-sm" style={{background:a.color}}>{a.code||a.name.slice(0,2).toUpperCase()}</div>
                                        <div>
                                            <h3 className="font-black text-gray-900 text-sm leading-tight">{a.name}</h3>
                                            <p className="text-[10px] text-gray-400 font-mono">{a.code}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${a.active?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{a.active?'Active':'Inactive'}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mb-3">
                                    {(a.grade_levels||[]).map(g=><span key={g} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">{g}</span>)}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-500">{a.strand_count||0} strands</span>
                                    <div className="flex gap-1">
                                        <button onClick={()=>{setSelArea(a);setTab('strands');}} className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100 transition-colors">View Strands →</button>
                                        <button onClick={()=>openModal('area',a)} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><FiEdit2 size={12}/></button>
                                        <button onClick={()=>del('school_cbc_learning_areas',a.id,setAreas)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={12}/></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                    <button onClick={()=>openModal('area')} className="bg-white rounded-2xl shadow-sm border-2 border-dashed border-gray-200 p-8 flex flex-col items-center justify-center gap-2 hover:border-purple-400 hover:bg-purple-50 transition-all group">
                        <FiPlus size={24} className="text-gray-300 group-hover:text-purple-500 transition-colors"/>
                        <span className="text-sm font-semibold text-gray-400 group-hover:text-purple-600">Add Learning Area</span>
                    </button>
                </div>
            )}

            {/* ── STRANDS ── */}
            {tab==='strands' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}} className="text-white">
                                {['#','Strand Name','Code','Learning Area','Sub-Strands','Status',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {filteredStrands.length===0?<tr><td colSpan={7} className="text-center py-16 text-gray-400"><FiLayers size={36} className="mx-auto mb-2 opacity-30"/><p>No strands found</p></td></tr>
                                :filteredStrands.map((s,i)=>{
                                    const area=areas.find(a=>a.id===s.learning_area_id);
                                    return <tr key={s.id} className={`border-b border-gray-100 hover:bg-purple-50/30 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-400">{s.order_no}</td>
                                        <td className="px-4 py-3 font-bold text-gray-900 text-xs">{s.name}</td>
                                        <td className="px-4 py-3 text-[10px] font-mono text-purple-700 bg-purple-50 rounded w-fit">{s.code||'—'}</td>
                                        <td className="px-4 py-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white" style={{background:area?.color||'#6B7280'}}>{area?.name||'—'}</span></td>
                                        <td className="px-4 py-3 text-xs text-center font-bold text-indigo-700">{s.sub_strand_count||0}</td>
                                        <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${s.active?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{s.active?'Active':'Inactive'}</span></td>
                                        <td className="px-4 py-3"><div className="flex gap-1">
                                            <button onClick={()=>{setSelArea(areas.find(a=>a.id===s.learning_area_id)||null);setSelStrand(s);setTab('substrands');}} className="text-[10px] px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold">Sub-Strands →</button>
                                            <button onClick={()=>{setSelArea(areas.find(a=>a.id===s.learning_area_id)||null);openModal('strand',s);}} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><FiEdit2 size={12}/></button>
                                            <button onClick={()=>del('school_cbc_strands',s.id,setStrands)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={12}/></button>
                                        </div></td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── SUB-STRANDS ── */}
            {tab==='substrands' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead><tr style={{background:'linear-gradient(135deg,#0F2044,#1E3A5F)'}} className="text-white">
                                {['#','Sub-Strand','Code','Strand','EE Descriptor','ME Descriptor','Status',''].map(h=><th key={h} className="text-left px-4 py-3 text-xs font-semibold">{h}</th>)}
                            </tr></thead>
                            <tbody>
                                {filteredSubStrands.length===0?<tr><td colSpan={8} className="text-center py-16 text-gray-400"><FiGrid size={36} className="mx-auto mb-2 opacity-30"/><p>No sub-strands found. Select a strand and click "Add Sub-Strand".</p></td></tr>
                                :filteredSubStrands.map((ss,i)=>{
                                    const strand=strands.find(s=>s.id===ss.strand_id);
                                    return <tr key={ss.id} className={`border-b border-gray-100 hover:bg-indigo-50/30 ${i%2===0?'bg-white':'bg-slate-50/50'}`}>
                                        <td className="px-4 py-3 text-xs font-bold text-gray-400">{ss.order_no}</td>
                                        <td className="px-4 py-3 font-bold text-gray-900 text-xs">{ss.name}</td>
                                        <td className="px-4 py-3 text-[10px] font-mono text-indigo-700">{ss.code||'—'}</td>
                                        <td className="px-4 py-3 text-xs text-gray-600">{strand?.name||'—'}</td>
                                        <td className="px-4 py-3 text-[10px] text-emerald-700 max-w-[160px]"><span className="line-clamp-2">{ss.descriptor_ee||'—'}</span></td>
                                        <td className="px-4 py-3 text-[10px] text-blue-700 max-w-[160px]"><span className="line-clamp-2">{ss.descriptor_me||'—'}</span></td>
                                        <td className="px-4 py-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ss.active?'bg-emerald-100 text-emerald-700':'bg-gray-100 text-gray-500'}`}>{ss.active?'Active':'Inactive'}</span></td>
                                        <td className="px-4 py-3"><div className="flex gap-1">
                                            <button onClick={()=>{setSelStrand(strands.find(s=>s.id===ss.strand_id)||null);openModal('substrand',ss);}} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"><FiEdit2 size={12}/></button>
                                            <button onClick={()=>del('school_cbc_sub_strands',ss.id,setSubStrands)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><FiTrash2 size={12}/></button>
                                        </div></td>
                                    </tr>;
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── MODAL ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
                            <h2 className="font-black text-gray-900 flex items-center gap-2"><FiSettings className="text-purple-600"/>
                                {editItem?'Edit':'Add'} {modalType==='area'?'Learning Area':modalType==='strand'?'Strand':'Sub-Strand'}
                            </h2>
                            <button onClick={()=>{setShowModal(false);setEditItem(null);}} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"><FiX size={16}/></button>
                        </div>
                        <div className="p-5 space-y-3">
                            {modalType==='area'&&(<>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Name *</label><input value={aForm.name} onChange={e=>setAForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Mathematics Activities" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Code</label><input value={aForm.code} onChange={e=>setAForm(p=>({...p,code:e.target.value}))} placeholder="e.g. MA" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Color</label>
                                        <div className="flex gap-1 flex-wrap">{AREA_COLORS.map(c=><button key={c} type="button" onClick={()=>setAForm(p=>({...p,color:c}))} className={`w-7 h-7 rounded-lg transition-all ${aForm.color===c?'ring-2 ring-offset-1 ring-gray-600 scale-110':''}`} style={{background:c}}/>)}</div>
                                    </div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Grade Levels</label>
                                    <div className="flex flex-wrap gap-2">{GRADE_LEVELS.map(g=><button key={g} type="button" onClick={()=>setAForm(p=>({...p,grade_levels:p.grade_levels.includes(g)?p.grade_levels.filter(x=>x!==g):[...p.grade_levels,g]}))} className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${aForm.grade_levels.includes(g)?'bg-blue-600 text-white border-blue-600':'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`}>{g}</button>)}</div>
                                </div>
                                <div className="flex items-center gap-2"><input type="checkbox" id="active-a" checked={aForm.active} onChange={e=>setAForm(p=>({...p,active:e.target.checked}))} className="rounded"/><label htmlFor="active-a" className="text-sm text-gray-700">Active (visible in mark entry)</label></div>
                                <button onClick={saveArea} disabled={saving} className="w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}>
                                    {saving?<FiRefreshCw size={14} className="animate-spin"/>:<FiSave size={14}/>}{editItem?'Update':'Create'} Learning Area
                                </button>
                            </>)}
                            {modalType==='strand'&&(<>
                                {selArea&&<div className="p-2.5 rounded-lg text-xs font-medium border" style={{background:selArea.color+'15',borderColor:selArea.color+'40',color:selArea.color}}>Adding to: {selArea.name}</div>}
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Strand Name *</label><input value={sForm.name} onChange={e=>setSForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Numbers" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Code</label><input value={sForm.code} onChange={e=>setSForm(p=>({...p,code:e.target.value}))} placeholder="e.g. NUM" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Order No.</label><input type="number" min={1} value={sForm.order_no} onChange={e=>setSForm(p=>({...p,order_no:Number(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400 outline-none"/></div>
                                </div>
                                <div className="flex items-center gap-2"><input type="checkbox" id="active-s" checked={sForm.active} onChange={e=>setSForm(p=>({...p,active:e.target.checked}))} className="rounded"/><label htmlFor="active-s" className="text-sm text-gray-700">Active</label></div>
                                <button onClick={saveStrand} disabled={saving} className="w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg" style={{background:'linear-gradient(135deg,#7C3AED,#9333EA)'}}>
                                    {saving?<FiRefreshCw size={14} className="animate-spin"/>:<FiSave size={14}/>}{editItem?'Update':'Create'} Strand
                                </button>
                            </>)}
                            {modalType==='substrand'&&(<>
                                {selStrand&&<div className="p-2.5 rounded-lg text-xs font-medium bg-indigo-50 border border-indigo-200 text-indigo-700">Adding to strand: {selStrand.name}</div>}
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">Sub-Strand Name *</label><input value={ssForm.name} onChange={e=>setSSForm(p=>({...p,name:e.target.value}))} placeholder="e.g. Fractions" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"/></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Code</label><input value={ssForm.code} onChange={e=>setSSForm(p=>({...p,code:e.target.value}))} placeholder="e.g. NUM-FR" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-400 outline-none"/></div>
                                    <div><label className="block text-xs font-bold text-gray-700 mb-1">Order No.</label><input type="number" min={1} value={ssForm.order_no} onChange={e=>setSSForm(p=>({...p,order_no:Number(e.target.value)}))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"/></div>
                                </div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">🌟 EE Descriptor (Exceeding Expectation)</label><textarea value={ssForm.descriptor_ee} onChange={e=>setSSForm(p=>({...p,descriptor_ee:e.target.value}))} rows={2} placeholder="What does a student doing EE look like for this sub-strand?" className="w-full border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-400 outline-none resize-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">✅ ME Descriptor (Meeting Expectation)</label><textarea value={ssForm.descriptor_me} onChange={e=>setSSForm(p=>({...p,descriptor_me:e.target.value}))} rows={2} placeholder="What does a student doing ME look like?" className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 outline-none resize-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">⚡ AE Descriptor (Approaching Expectation)</label><textarea value={ssForm.descriptor_ae} onChange={e=>setSSForm(p=>({...p,descriptor_ae:e.target.value}))} rows={2} placeholder="What does AE look like?" className="w-full border border-amber-200 bg-amber-50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-amber-400 outline-none resize-none"/></div>
                                <div><label className="block text-xs font-bold text-gray-700 mb-1">🔴 BE Descriptor (Below Expectation)</label><textarea value={ssForm.descriptor_be} onChange={e=>setSSForm(p=>({...p,descriptor_be:e.target.value}))} rows={2} placeholder="What does BE look like? What support is needed?" className="w-full border border-red-200 bg-red-50 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-red-400 outline-none resize-none"/></div>
                                <div className="flex items-center gap-2"><input type="checkbox" id="active-ss" checked={ssForm.active} onChange={e=>setSSForm(p=>({...p,active:e.target.checked}))} className="rounded"/><label htmlFor="active-ss" className="text-sm text-gray-700">Active</label></div>
                                <button onClick={saveSubStrand} disabled={saving} className="w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-sm font-bold shadow-lg" style={{background:'linear-gradient(135deg,#6366F1,#4F46E5)'}}>
                                    {saving?<FiRefreshCw size={14} className="animate-spin"/>:<FiSave size={14}/>}{editItem?'Update':'Create'} Sub-Strand
                                </button>
                            </>)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

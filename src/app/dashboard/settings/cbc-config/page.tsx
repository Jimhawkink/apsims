'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
    FiSettings, FiPlus, FiSearch, FiSave, FiTrash2, FiEdit2, FiX,
    FiChevronRight, FiChevronDown, FiChevronUp, FiRefreshCw, FiDownload,
    FiUpload, FiCheck, FiLayers, FiBook, FiGrid, FiAward, FiStar,
    FiCopy, FiZap, FiShield, FiAlertCircle, FiCheckCircle,
} from 'react-icons/fi';

const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type CompLevel = 'EE' | 'ME' | 'AE' | 'BE';
type GradeLevel = 'PP1' | 'PP2' | 'Grade 1' | 'Grade 2' | 'Grade 3' | 'Grade 4' | 'Grade 5' | 'Grade 6' | 'Grade 7' | 'Grade 8' | 'Grade 9';

interface LearningArea { id: string; name: string; code: string; grade_levels: GradeLevel[]; active: boolean; color: string; }
interface Strand { id: string; learning_area_id: string; name: string; code: string; order_no: number; active: boolean; }
interface SubStrand { id: string; strand_id: string; name: string; code: string; order_no: number; active: boolean; descriptors?: Record<CompLevel, string>; }

const COMP_COLORS: Record<CompLevel, { color: string; bg: string; label: string }> = {
    EE: { color: '#059669', bg: '#ECFDF5', label: 'Exceeding Expectation' },
    ME: { color: '#2563EB', bg: '#EFF6FF', label: 'Meeting Expectation' },
    AE: { color: '#D97706', bg: '#FFFBEB', label: 'Approaching Expectation' },
    BE: { color: '#DC2626', bg: '#FEF2F2', label: 'Below Expectation' },
};

const GRADE_LEVELS: GradeLevel[] = ['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'];

const AREA_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#84cc16','#f97316','#ec4899','#14b8a6','#3b82f6','#a855f7','#eab308'];

// ── KICD Official Learning Areas ────────────────────────────────────────────
const KICD_AREAS: LearningArea[] = [
    { id:'la1', name:'Literacy Activities', code:'LIT', grade_levels:['PP1','PP2','Grade 1','Grade 2'], active:true, color:'#6366f1' },
    { id:'la2', name:'Kiswahili Language Activities', code:'KIS', grade_levels:['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'], active:true, color:'#0ea5e9' },
    { id:'la3', name:'English Language Activities', code:'ENG', grade_levels:['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6'], active:true, color:'#10b981' },
    { id:'la4', name:'Mathematics Activities', code:'MAT', grade_levels:['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#f59e0b' },
    { id:'la5', name:'Environmental Activities', code:'ENV', grade_levels:['PP1','PP2','Grade 1','Grade 2','Grade 3'], active:true, color:'#22c55e' },
    { id:'la6', name:'Hygiene & Nutrition', code:'HYG', grade_levels:['PP1','PP2','Grade 1','Grade 2','Grade 3'], active:true, color:'#ef4444' },
    { id:'la7', name:'Religious Education', code:'CRE', grade_levels:['Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#8b5cf6' },
    { id:'la8', name:'Creative Arts & Crafts', code:'CRT', grade_levels:['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#ec4899' },
    { id:'la9', name:'Physical & Health Education', code:'PHE', grade_levels:['PP1','PP2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#06b6d4' },
    { id:'la10', name:'Pre-Technical Studies', code:'PTS', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#f97316' },
    { id:'la11', name:'Agriculture', code:'AGR', grade_levels:['Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#84cc16' },
    { id:'la12', name:'Social Studies', code:'SST', grade_levels:['Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#14b8a6' },
    { id:'la13', name:'Business Studies', code:'BST', grade_levels:['Grade 7','Grade 8','Grade 9'], active:true, color:'#a855f7' },
    { id:'la14', name:'ICT', code:'ICT', grade_levels:['Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9'], active:true, color:'#3b82f6' },
];

const KICD_STRANDS: Record<string, string[]> = {
    'Literacy Activities': ['Listening & Speaking','Phonological Awareness','Pre-Reading','Pre-Writing','Enjoying Literature'],
    'English Language Activities': ['Listening & Speaking','Reading','Writing','Grammar & Vocabulary','Literature'],
    'Kiswahili Language Activities': ['Kusikiliza na Kuzungumza','Kusoma','Kuandika','Sarufi na Msamiati','Fasihi'],
    'Mathematics Activities': ['Numbers','Measurement','Geometry','Algebra','Data Handling & Probability'],
    'Environmental Activities': ['Physical Environment','Living Things','Social Environment','Technology in Environment'],
    'Hygiene & Nutrition': ['Personal Hygiene','Environmental Hygiene','Nutrition','Food Preparation'],
    'Religious Education': ['Faith & Beliefs','Moral Values','Social Responsibility','Worship & Prayer'],
    'Creative Arts & Crafts': ['Visual Arts','Performing Arts','Music','Craft & Design'],
    'Physical & Health Education': ['Physical Fitness','Games & Sports','Gymnastics','Swimming & Aquatics','Health Education'],
    'Pre-Technical Studies': ['Materials & Tools','Structures','Energy','Electronics & Electricity','Technical Drawing'],
    'Agriculture': ['Crop Production','Animal Production','Farm Structures','Agribusiness','Natural Resources'],
    'Social Studies': ['Geography','History','Civics','Human Rights','Global Citizenship'],
    'Business Studies': ['Entrepreneurship','Book-keeping','Commerce','Office Practice'],
    'ICT': ['Digital Citizenship','Hardware & Software','Programming & Coding','Internet & Online Safety','Data Management'],
};

const DEFAULT_DESCRIPTORS: Record<CompLevel, string> = {
    EE: 'Student demonstrates knowledge and skills that significantly exceed the expected level for this grade. Shows exceptional understanding and can apply concepts independently in new situations.',
    ME: 'Student demonstrates knowledge and skills at the expected level for this grade. Shows adequate understanding and can apply concepts with minimal support.',
    AE: 'Student demonstrates some knowledge and skills but has not yet reached the expected level for this grade. Requires moderate support to apply concepts.',
    BE: 'Student demonstrates limited knowledge and skills and is significantly below the expected level for this grade. Requires intensive support and intervention.',
};

export default function CBCConfigBuilderPage() {
    const [areas, setAreas] = useState<LearningArea[]>(KICD_AREAS);
    const [strands, setStrands] = useState<Strand[]>([]);
    const [subStrands, setSubStrands] = useState<SubStrand[]>([]);
    const [dbReady, setDbReady] = useState(false);
    const [search, setSearch] = useState('');
    const [expandedArea, setExpandedArea] = useState<string | null>(null);
    const [expandedStrand, setExpandedStrand] = useState<string | null>(null);
    const [activeGrade, setActiveGrade] = useState<GradeLevel | ''>('');
    const [tab, setTab] = useState<'areas' | 'strands' | 'descriptors' | 'grades'>('areas');

    // Modals
    const [showAreaModal, setShowAreaModal] = useState(false);
    const [showStrandModal, setShowStrandModal] = useState(false);
    const [showSubStrandModal, setShowSubStrandModal] = useState(false);
    const [editStrandParent, setEditStrandParent] = useState<string>('');
    const [editSubStrandParent, setEditSubStrandParent] = useState<string>('');
    const [saving, setSaving] = useState(false);

    const [areaForm, setAreaForm] = useState({ name:'', code:'', grade_levels: [] as GradeLevel[], color: '#6366f1' });
    const [strandForm, setStrandForm] = useState({ name:'', code:'', order_no: 1 });
    const [subStrandForm, setSubStrandForm] = useState({ name:'', code:'', order_no: 1, descriptors: { ...DEFAULT_DESCRIPTORS } });

    // Initialize strands from KICD data
    useEffect(() => {
        const initStrands: Strand[] = [];
        const initSubs: SubStrand[] = [];
        KICD_AREAS.forEach(area => {
            const areaStrands = KICD_STRANDS[area.name] || [];
            areaStrands.forEach((sName, i) => {
                const sid = `str-${area.id}-${i}`;
                initStrands.push({ id: sid, learning_area_id: area.id, name: sName, code: sName.slice(0,3).toUpperCase(), order_no: i+1, active: true });
                // Add 2-3 sub-strands per strand
                [' — Foundational Skills', ' — Intermediate Skills', ' — Advanced Application'].forEach((suffix, j) => {
                    initSubs.push({ id: `sub-${sid}-${j}`, strand_id: sid, name: sName + suffix, code: `${sName.slice(0,2).toUpperCase()}${j+1}`, order_no: j+1, active: true, descriptors: { ...DEFAULT_DESCRIPTORS } });
                });
            });
        });
        setStrands(initStrands);
        setSubStrands(initSubs);
    }, []);

    const filteredAreas = useMemo(() => areas.filter(a =>
        (!search || a.name.toLowerCase().includes(search.toLowerCase()) || a.code.toLowerCase().includes(search.toLowerCase()))
        && (!activeGrade || a.grade_levels.includes(activeGrade as GradeLevel))
    ), [areas, search, activeGrade]);

    const getAreaStrands = (areaId: string) => strands.filter(s => s.learning_area_id === areaId);
    const getStrandSubs = (strandId: string) => subStrands.filter(s => s.strand_id === strandId);

    function addStrand(areaId: string) {
        if (!strandForm.name) { toast.error('Strand name required'); return; }
        const newStrand: Strand = { id: `str-${Date.now()}`, learning_area_id: areaId, name: strandForm.name, code: strandForm.code || strandForm.name.slice(0,3).toUpperCase(), order_no: strandForm.order_no, active: true };
        setStrands(p => [...p, newStrand]);
        setStrandForm({ name:'', code:'', order_no: 1 });
        setShowStrandModal(false);
        toast.success('Strand added!');
    }

    function addSubStrand(strandId: string) {
        if (!subStrandForm.name) { toast.error('Sub-strand name required'); return; }
        const newSub: SubStrand = { id: `sub-${Date.now()}`, strand_id: strandId, name: subStrandForm.name, code: subStrandForm.code || subStrandForm.name.slice(0,3).toUpperCase(), order_no: subStrandForm.order_no, active: true, descriptors: { ...subStrandForm.descriptors } };
        setSubStrands(p => [...p, newSub]);
        setSubStrandForm({ name:'', code:'', order_no: 1, descriptors: { ...DEFAULT_DESCRIPTORS } });
        setShowSubStrandModal(false);
        toast.success('Sub-strand added!');
    }

    function toggleArea(id: string) { setAreas(p => p.map(a => a.id === id ? {...a, active: !a.active} : a)); }
    function deleteStrand(id: string) { if (!confirm('Delete this strand and all its sub-strands?')) return; setStrands(p => p.filter(s => s.id !== id)); setSubStrands(p => p.filter(s => s.strand_id !== id)); toast.success('Deleted'); }
    function deleteSubStrand(id: string) { if (!confirm('Delete this sub-strand?')) return; setSubStrands(p => p.filter(s => s.id !== id)); toast.success('Deleted'); }

    function exportConfig() {
        const config = { areas, strands, subStrands, exportedAt: new Date().toISOString(), version: '1.0' };
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], {type:'application/json'}));
        a.download = `cbc-config-${new Date().toISOString().slice(0,10)}.json`; a.click();
        toast.success('Config exported!');
    }

    const SQL = `-- CBC Config Tables (run in Supabase SQL Editor)
CREATE TABLE IF NOT EXISTS school_cbc_learning_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL, code text, grade_levels text[], active boolean DEFAULT true,
  color text, created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS school_cbc_strands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_area_id uuid REFERENCES school_cbc_learning_areas(id) ON DELETE CASCADE,
  name text NOT NULL, code text, order_no int DEFAULT 1, active boolean DEFAULT true
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

    return (
        <div className="min-h-screen pb-12" style={{ background: 'linear-gradient(135deg,#f0f9ff 0%,#fdf4ff 50%,#f0fdf4 100%)' }}>
            <Toaster position="top-right" />

            {/* HERO */}
            <div style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 40%,#064e3b 100%)' }} className="px-6 py-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center gap-2 text-emerald-300 text-xs mb-4">
                        <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
                        <FiChevronRight size={12} />
                        <Link href="/dashboard/settings" className="hover:text-white transition-colors">Settings</Link>
                        <FiChevronRight size={12} />
                        <span className="text-white font-medium">⚙️ CBC Config Builder</span>
                    </div>
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                                <span className="text-4xl">⚙️</span> CBC Subject & Strand Config Builder
                            </h1>
                            <p className="text-emerald-200 text-sm">Configure all Learning Areas, Strands, Sub-Strands & Competency Descriptors per KICD framework</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={exportConfig} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all">
                                <FiDownload size={15} /> Export JSON
                            </button>
                        </div>
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-3 mt-6">
                        {[
                            { label: 'Learning Areas', value: areas.length, icon: '📚', sub: `${areas.filter(a=>a.active).length} active` },
                            { label: 'Total Strands', value: strands.length, icon: '🧩', sub: 'KICD aligned' },
                            { label: 'Sub-Strands', value: subStrands.length, icon: '📌', sub: 'with descriptors' },
                            { label: 'Grade Levels', value: 11, icon: '🎓', sub: 'PP1 — Grade 9' },
                        ].map(k => (
                            <div key={k.label} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                                <div className="text-2xl mb-0.5">{k.icon}</div>
                                <div className="text-2xl font-bold text-white">{k.value}</div>
                                <div className="text-emerald-200 text-[10px]">{k.label}</div>
                                <div className="text-white/40 text-[9px]">{k.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 lg:px-6 mt-6 space-y-5">
                {/* Tabs */}
                <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-200 w-fit flex-wrap">
                    {[
                        { key:'areas', label:'📚 Learning Areas' },
                        { key:'strands', label:'🧩 Strands & Sub-Strands' },
                        { key:'descriptors', label:'📋 Competency Descriptors' },
                        { key:'grades', label:'🎓 Grade Level Map' },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.key ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* LEARNING AREAS TAB */}
                {tab === 'areas' && (
                    <div className="space-y-4">
                        <div className="flex gap-3 flex-wrap">
                            <div className="relative flex-1 min-w-48">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search learning areas..." className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white" />
                            </div>
                            <select value={activeGrade} onChange={e => setActiveGrade(e.target.value as any)} className="border border-gray-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                                <option value="">All Grades</option>
                                {GRADE_LEVELS.map(g => <option key={g}>{g}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {filteredAreas.map(area => {
                                const areaStrands = getAreaStrands(area.id);
                                const expanded = expandedArea === area.id;
                                return (
                                    <div key={area.id} className={`bg-white rounded-xl shadow-sm border transition-all duration-200 ${area.active ? 'border-gray-200' : 'border-dashed border-gray-300 opacity-60'}`}>
                                        <div className="flex items-center gap-3 p-4">
                                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow flex-shrink-0" style={{ background: area.color }}>
                                                {area.code.slice(0,2)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-gray-900 text-sm">{area.name}</h3>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {area.grade_levels.slice(0,4).map(g => (
                                                        <span key={g} className="text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{g}</span>
                                                    ))}
                                                    {area.grade_levels.length > 4 && <span className="text-[9px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">+{area.grade_levels.length-4} more</span>}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${area.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {area.active ? 'Active' : 'Inactive'}
                                                </span>
                                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{areaStrands.length} strands</span>
                                                <button onClick={() => toggleArea(area.id)} className={`p-1.5 rounded-lg transition-colors ${area.active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-gray-400 hover:bg-gray-50'}`}>
                                                    <FiCheck size={13} />
                                                </button>
                                                <button onClick={() => setExpandedArea(expanded ? null : area.id)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                                                    {expanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                                                </button>
                                            </div>
                                        </div>

                                        {expanded && (
                                            <div className="border-t border-gray-100 p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-semibold text-gray-600">Strands ({areaStrands.length})</span>
                                                    <button onClick={() => { setEditStrandParent(area.id); setShowStrandModal(true); }} className="flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-medium bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg transition-colors">
                                                        <FiPlus size={11} /> Add Strand
                                                    </button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {areaStrands.map(s => {
                                                        const subs = getStrandSubs(s.id);
                                                        const strExpanded = expandedStrand === s.id;
                                                        return (
                                                            <div key={s.id} className="bg-gray-50 rounded-lg overflow-hidden">
                                                                <div className="flex items-center gap-2 px-3 py-2">
                                                                    <div className="w-5 h-5 rounded flex items-center justify-center text-[8px] font-bold text-white" style={{ background: area.color }}>{s.code.slice(0,2)}</div>
                                                                    <span className="text-xs font-medium text-gray-700 flex-1">{s.name}</span>
                                                                    <span className="text-[9px] text-gray-400">{subs.length} sub-strands</span>
                                                                    <button onClick={() => { setEditSubStrandParent(s.id); setShowSubStrandModal(true); }} className="text-[9px] text-blue-600 hover:bg-blue-50 px-1.5 py-0.5 rounded transition-colors font-medium">+Sub</button>
                                                                    <button onClick={() => deleteStrand(s.id)} className="text-[9px] text-red-400 hover:text-red-600 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors">Del</button>
                                                                    <button onClick={() => setExpandedStrand(strExpanded ? null : s.id)} className="text-gray-400 hover:text-gray-600">
                                                                        {strExpanded ? <FiChevronUp size={11} /> : <FiChevronDown size={11} />}
                                                                    </button>
                                                                </div>
                                                                {strExpanded && subs.length > 0 && (
                                                                    <div className="border-t border-gray-200 px-3 pb-2">
                                                                        {subs.map(sub => (
                                                                            <div key={sub.id} className="flex items-center gap-2 py-1.5 border-b border-gray-100 last:border-0">
                                                                                <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0" />
                                                                                <span className="text-[11px] text-gray-600 flex-1">{sub.name}</span>
                                                                                <button onClick={() => deleteSubStrand(sub.id)} className="text-[9px] text-red-400 hover:text-red-600 transition-colors">✕</button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* STRANDS TAB */}
                {tab === 'strands' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiLayers className="text-emerald-600" /> All Strands & Sub-Strands ({strands.length} strands, {subStrands.length} sub-strands)</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Learning Area</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Strand</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Code</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Sub-Strands</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Status</th>
                                        <th className="px-4 py-3" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {strands.map(s => {
                                        const area = areas.find(a => a.id === s.learning_area_id);
                                        const subs = getStrandSubs(s.id);
                                        return (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: area?.color || '#6366f1' }} />
                                                        <span className="text-xs text-gray-600 truncate max-w-[140px]">{area?.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                                                <td className="px-4 py-3"><span className="font-mono text-[11px] bg-gray-100 px-2 py-0.5 rounded">{s.code}</span></td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">{subs.length} sub-strands</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{s.active ? 'Active' : 'Inactive'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button onClick={() => deleteStrand(s.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1"><FiTrash2 size={12} /></button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* DESCRIPTORS TAB */}
                {tab === 'descriptors' && (
                    <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                                <FiAlertCircle size={15} /> Competency Descriptors define exactly what EE, ME, AE and BE mean for each sub-strand. These print on CBC report cards.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {(Object.keys(COMP_COLORS) as CompLevel[]).map(k => {
                                const c = COMP_COLORS[k];
                                return (
                                    <div key={k} className="rounded-xl border-2 p-4" style={{ background: c.bg, borderColor: c.color + '40' }}>
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow" style={{ background: c.color }}>{k}</div>
                                            <div>
                                                <p className="font-bold text-sm" style={{ color: c.color }}>{k} — {c.label}</p>
                                            </div>
                                        </div>
                                        <textarea
                                            defaultValue={DEFAULT_DESCRIPTORS[k]}
                                            rows={4}
                                            className="w-full bg-white/70 border rounded-lg px-3 py-2 text-xs outline-none resize-none focus:ring-2"
                                            style={{ borderColor: c.color + '40' }}
                                            placeholder={`Default ${k} descriptor...`}
                                        />
                                        <p className="text-[10px] mt-1" style={{ color: c.color + 'aa' }}>This is the default descriptor used when no sub-strand specific descriptor is set.</p>
                                    </div>
                                );
                            })}
                        </div>
                        <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/20 transition-all">
                            <FiSave size={14} /> Save Default Descriptors
                        </button>
                    </div>
                )}

                {/* GRADE MAP TAB */}
                {tab === 'grades' && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2"><FiGrid className="text-purple-600" /> Grade Level — Learning Area Matrix</h2>
                            <p className="text-xs text-gray-500 mt-0.5">✅ = This learning area is taught at this grade level per KICD CBC framework</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700 min-w-[180px]">Learning Area</th>
                                        {GRADE_LEVELS.map(g => (
                                            <th key={g} className="text-center px-2 py-3 font-semibold text-gray-600 min-w-[60px]">{g}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {areas.map((area, i) => (
                                        <tr key={area.id} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-blue-50/30 transition-colors`}>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full" style={{ background: area.color }} />
                                                    <span className="font-medium text-gray-800">{area.name}</span>
                                                </div>
                                            </td>
                                            {GRADE_LEVELS.map(g => (
                                                <td key={g} className="text-center px-2 py-2.5">
                                                    {area.grade_levels.includes(g) ? (
                                                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-white" style={{ background: area.color }}>
                                                            <FiCheck size={10} />
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-200">—</span>
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* DB Setup */}
                <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-white flex items-center gap-2"><FiZap className="text-yellow-400" /> Database Setup SQL — Run in Supabase SQL Editor</p>
                        <button onClick={() => { navigator.clipboard.writeText(SQL); toast.success('Copied!'); }} className="flex items-center gap-1 text-xs bg-white/10 hover:bg-white/20 text-gray-300 px-2 py-1 rounded transition-colors">
                            <FiCopy size={11} /> Copy
                        </button>
                    </div>
                    <pre className="text-[10px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
                </div>
            </div>

            {/* ADD STRAND MODAL */}
            {showStrandModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowStrandModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100">
                            <h2 className="font-bold text-gray-900">Add New Strand</h2>
                            <button onClick={() => setShowStrandModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Strand Name *</label>
                                <input value={strandForm.name} onChange={e => setStrandForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Reading & Comprehension" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">Code (short)</label>
                                <input value={strandForm.code} onChange={e => setStrandForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="e.g. REA" maxLength={5} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none" />
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => setShowStrandModal(false)} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => addStrand(editStrandParent)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">Add Strand</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ADD SUB-STRAND MODAL */}
            {showSubStrandModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowSubStrandModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
                            <h2 className="font-bold text-gray-900">Add New Sub-Strand with Descriptors</h2>
                            <button onClick={() => setShowSubStrandModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><FiX size={16} /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Sub-Strand Name *</label>
                                    <input value={subStrandForm.name} onChange={e => setSubStrandForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Reading Fluency" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Code</label>
                                    <input value={subStrandForm.code} onChange={e => setSubStrandForm(p => ({...p, code: e.target.value.toUpperCase()}))} placeholder="e.g. RF1" maxLength={6} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-2">Competency Descriptors</label>
                                {(Object.keys(COMP_COLORS) as CompLevel[]).map(k => {
                                    const c = COMP_COLORS[k];
                                    return (
                                        <div key={k} className="mb-2">
                                            <label className="block text-[11px] font-semibold mb-1" style={{ color: c.color }}>{k} — {c.label}</label>
                                            <textarea value={subStrandForm.descriptors[k]} onChange={e => setSubStrandForm(p => ({...p, descriptors: {...p.descriptors, [k]: e.target.value}}))} rows={2} className="w-full border rounded-lg px-3 py-2 text-xs outline-none resize-none focus:ring-2" style={{ borderColor: c.color + '40' }} placeholder={`What does ${k} look like for this sub-strand?`} />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="flex gap-3 p-5 border-t border-gray-100">
                            <button onClick={() => setShowSubStrandModal(false)} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">Cancel</button>
                            <button onClick={() => addSubStrand(editSubStrandParent)} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors">Add Sub-Strand</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

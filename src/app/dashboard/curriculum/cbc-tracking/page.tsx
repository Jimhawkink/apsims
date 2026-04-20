'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiSave, FiX, FiRefreshCw, FiChevronDown, FiChevronRight, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const RUBRIC: Record<string, { label: string; color: string; bg: string; border: string }> = {
  EE: { label: 'Exceeding Expectations', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  ME: { label: 'Meeting Expectations', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  AE: { label: 'Approaching Expectations', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  BE: { label: 'Below Expectations', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};

export default function CBCTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [strands, setStrands] = useState<any[]>([]);
  const [subStrands, setSubStrands] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [summaries, setSummaries] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  const [expandedArea, setExpandedArea] = useState<number | null>(null);
  const [expandedStrand, setExpandedStrand] = useState<number | null>(null);
  const [expandedSubStrand, setExpandedSubStrand] = useState<number | null>(null);
  const [tab, setTab] = useState<'hierarchy' | 'tracking' | 'reports'>('hierarchy');

  // Modals
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showStrandModal, setShowStrandModal] = useState(false);
  const [showSubStrandModal, setShowSubStrandModal] = useState(false);
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const [areaForm, setAreaForm] = useState({ area_name: '', area_code: '', description: '' });
  const [strandForm, setStrandForm] = useState({ learning_area_id: 0, strand_name: '', strand_code: '' });
  const [subStrandForm, setSubStrandForm] = useState({ strand_id: 0, sub_strand_name: '', sub_strand_code: '' });
  const [outcomeForm, setOutcomeForm] = useState({ sub_strand_id: 0, outcome_code: '', outcome_description: '', rubric_ee: '', rubric_me: '', rubric_ae: '', rubric_be: '' });

  // Tracking filters
  const [trackStudent, setTrackStudent] = useState('');
  const [trackTerm, setTrackTerm] = useState('');
  const [trackArea, setTrackArea] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [la, st, ss, oc, as, su, sm, te] = await Promise.all([
      supabase.from('school_cbc_learning_areas').select('*').order('sort_order'),
      supabase.from('school_cbc_strands').select('*').order('sort_order'),
      supabase.from('school_cbc_sub_strands').select('*').order('sort_order'),
      supabase.from('school_cbc_learning_outcomes').select('*').order('sort_order'),
      supabase.from('school_cbc_assessments').select('*').order('assessment_date', { ascending: false }),
      supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id, stream_id').eq('status', 'Active').order('last_name'),
      supabase.from('school_cbc_competency_summary').select('*'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
    ]);
    setLearningAreas(la.data || []);
    setStrands(st.data || []);
    setSubStrands(ss.data || []);
    setOutcomes(oc.data || []);
    setAssessments(as.data || []);
    setStudents(su.data || []);
    setSummaries(sm.data || []);
    setTerms(te.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const getStrandsForArea = (areaId: number) => strands.filter(s => s.learning_area_id === areaId);
  const getSubStrandsForStrand = (strandId: number) => subStrands.filter(s => s.strand_id === strandId);
  const getOutcomesForSubStrand = (ssId: number) => outcomes.filter(o => o.sub_strand_id === ssId);

  const handleSaveArea = async () => {
    if (!areaForm.area_name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_cbc_learning_areas').insert([{ area_name: areaForm.area_name.trim(), area_code: areaForm.area_code.trim() || null, description: areaForm.description.trim() || null }]);
    if (error) toast.error(error.message); else { toast.success('✅ Learning Area added!'); setShowAreaModal(false); fetchAll(); }
    setSaving(false);
  };

  const handleSaveStrand = async () => {
    if (!strandForm.strand_name.trim() || !strandForm.learning_area_id) { toast.error('Name & area required'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_cbc_strands').insert([{ learning_area_id: strandForm.learning_area_id, strand_name: strandForm.strand_name.trim(), strand_code: strandForm.strand_code.trim() || null }]);
    if (error) toast.error(error.message); else { toast.success('✅ Strand added!'); setShowStrandModal(false); fetchAll(); }
    setSaving(false);
  };

  const handleSaveSubStrand = async () => {
    if (!subStrandForm.sub_strand_name.trim() || !subStrandForm.strand_id) { toast.error('Name & strand required'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_cbc_sub_strands').insert([{ strand_id: subStrandForm.strand_id, sub_strand_name: subStrandForm.sub_strand_name.trim(), sub_strand_code: subStrandForm.sub_strand_code.trim() || null }]);
    if (error) toast.error(error.message); else { toast.success('✅ Sub-Strand added!'); setShowSubStrandModal(false); fetchAll(); }
    setSaving(false);
  };

  const handleSaveOutcome = async () => {
    if (!outcomeForm.outcome_code.trim() || !outcomeForm.outcome_description.trim() || !outcomeForm.sub_strand_id) { toast.error('Code, description & sub-strand required'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_cbc_learning_outcomes').insert([{
      sub_strand_id: outcomeForm.sub_strand_id, outcome_code: outcomeForm.outcome_code.trim(),
      outcome_description: outcomeForm.outcome_description.trim(),
      rubric_ee: outcomeForm.rubric_ee.trim() || null, rubric_me: outcomeForm.rubric_me.trim() || null,
      rubric_ae: outcomeForm.rubric_ae.trim() || null, rubric_be: outcomeForm.rubric_be.trim() || null,
    }]);
    if (error) toast.error(error.message); else { toast.success('✅ Learning Outcome added!'); setShowOutcomeModal(false); fetchAll(); }
    setSaving(false);
  };

  const handleDeleteOutcome = async (id: number) => {
    if (!confirm('Delete this outcome?')) return;
    const { error } = await supabase.from('school_cbc_learning_outcomes').delete().eq('id', id);
    if (error) toast.error('Failed'); else { toast.success('Deleted'); fetchAll(); }
  };

  // Student competency data
  const studentAssessments = useMemo(() => {
    if (!trackStudent) return [];
    return assessments.filter(a => a.student_id === Number(trackStudent));
  }, [assessments, trackStudent]);

  const studentSummaries = useMemo(() => {
    if (!trackStudent) return [];
    return summaries.filter(s => s.student_id === Number(trackStudent));
  }, [summaries, trackStudent]);

  if (loading) return (<div className="flex flex-col items-center justify-center h-64 gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#22c55e,#059669)' }}>🎯</div><p className="text-sm font-bold text-gray-500">Loading CBC Tracking…</p></div>);

  return (<div className="animate-fadeIn space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.03em' }}>🎯 CBC Competency Tracking</h1><p className="text-sm text-gray-500 mt-1">{learningAreas.length} learning areas · {strands.length} strands · {outcomes.length} outcomes</p></div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-200 transition"><FiRefreshCw size={15} /></button>
        <button onClick={() => { setShowOutcomeModal(true); setOutcomeForm({ sub_strand_id: 0, outcome_code: '', outcome_description: '', rubric_ee: '', rubric_me: '', rubric_ae: '', rubric_be: '' }); }} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#f0fdf4', color: '#15803d', border: 'none', cursor: 'pointer' }}>➕ Add Outcome</button>
        <button onClick={() => { setShowAreaModal(true); setAreaForm({ area_name: '', area_code: '', description: '' }); }} className="px-4 py-2.5 rounded-xl text-sm font-bold" style={{ background: '#f0fdfa', color: '#0f766e', border: 'none', cursor: 'pointer' }}>📂 Add Area</button>
      </div>
    </div>

    {/* KPI Cards */}
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      {[{ l: 'Learning Areas', v: learningAreas.length, e: '📖', c: '#059669' }, { l: 'Strands', v: strands.length, e: '🔗', c: '#2563eb' }, { l: 'Sub-Strands', v: subStrands.length, e: '📂', c: '#7c3aed' }, { l: 'Outcomes', v: outcomes.length, e: '🎯', c: '#6366f1' }, { l: 'Assessments', v: assessments.length, e: '📋', c: '#f59e0b' }, { l: 'Students', v: students.length, e: '👨‍🎓', c: '#06b6d4' }].map((cd, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden" style={{ borderLeftWidth: 4, borderLeftColor: cd.c }}>
          <div className="flex items-center justify-between mb-2"><p className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">{cd.l}</p><span className="text-xl">{cd.e}</span></div>
          <p className="text-xl font-extrabold text-gray-900">{cd.v}</p><div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full opacity-[0.06]" style={{ background: cd.c }} />
        </div>))}
    </div>

    {/* Tabs */}
    <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
      {[{ k: 'hierarchy', l: '🏗️ Hierarchy' }, { k: 'tracking', l: '📊 Student Tracking' }, { k: 'reports', l: '📈 Reports' }].map(t => (
        <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab === t.k ? 'bg-white shadow text-green-700' : 'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>
      ))}
    </div>

    {tab === 'hierarchy' && <div className="space-y-3">
      {learningAreas.map(area => {
        const areaStrands = getStrandsForArea(area.id);
        const isAreaOpen = expandedArea === area.id;
        return (<div key={area.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition" onClick={() => setExpandedArea(isAreaOpen ? null : area.id)}>
            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: '#f0fdf4', color: '#15803d' }}>📖</span>
            <div className="flex-1"><h3 className="text-sm font-bold text-gray-900">{area.area_name}</h3><p className="text-[10px] text-gray-400">{areaStrands.length} strands · {area.area_code}</p></div>
            <div className="flex items-center gap-2">
              <button onClick={e => { e.stopPropagation(); setShowStrandModal(true); setStrandForm({ learning_area_id: area.id, strand_name: '', strand_code: '' }); }} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-green-50 text-green-700 hover:bg-green-100 transition">+ Strand</button>
              {isAreaOpen ? <FiChevronDown size={16} className="text-gray-400" /> : <FiChevronRight size={16} className="text-gray-400" />}
            </div>
          </div>

          {isAreaOpen && <div className="border-t border-gray-50 px-5 py-3 space-y-2">
            {areaStrands.map(strand => {
              const strandSubs = getSubStrandsForStrand(strand.id);
              const isStrandOpen = expandedStrand === strand.id;
              return (<div key={strand.id} className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer bg-blue-50/30 hover:bg-blue-50/50 transition" onClick={() => setExpandedStrand(isStrandOpen ? null : strand.id)}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs" style={{ background: '#eff6ff', color: '#1d4ed8' }}>🔗</span>
                  <div className="flex-1"><p className="text-xs font-bold text-gray-800">{strand.strand_name}</p><p className="text-[10px] text-gray-400">{strandSubs.length} sub-strands</p></div>
                  <button onClick={e => { e.stopPropagation(); setShowSubStrandModal(true); setSubStrandForm({ strand_id: strand.id, sub_strand_name: '', sub_strand_code: '' }); }} className="px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition">+ Sub</button>
                  {isStrandOpen ? <FiChevronDown size={14} className="text-gray-400" /> : <FiChevronRight size={14} className="text-gray-400" />}
                </div>

                {isStrandOpen && <div className="px-4 py-2 space-y-1.5 bg-white">
                  {strandSubs.map(ss => {
                    const ssOutcomes = getOutcomesForSubStrand(ss.id);
                    const isSSOpen = expandedSubStrand === ss.id;
                    return (<div key={ss.id}>
                      <div className="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-purple-50/30 rounded-lg transition" onClick={() => setExpandedSubStrand(isSSOpen ? null : ss.id)}>
                        <span className="w-5 h-5 rounded flex items-center justify-center text-[10px]" style={{ background: '#faf5ff', color: '#7c3aed' }}>📂</span>
                        <p className="text-xs font-semibold text-gray-700 flex-1">{ss.sub_strand_name}</p>
                        <span className="text-[9px] font-bold text-gray-400">{ssOutcomes.length} outcomes</span>
                        <button onClick={e => { e.stopPropagation(); setShowOutcomeModal(true); setOutcomeForm({ sub_strand_id: ss.id, outcome_code: '', outcome_description: '', rubric_ee: '', rubric_me: '', rubric_ae: '', rubric_be: '' }); }} className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 transition">+</button>
                        {isSSOpen ? <FiChevronDown size={12} className="text-gray-400" /> : <FiChevronRight size={12} className="text-gray-400" />}
                      </div>

                      {isSSOpen && <div className="ml-7 space-y-1.5 mt-1 mb-2">
                        {ssOutcomes.map(oc => (
                          <div key={oc.id} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50">
                            <div className="flex items-start justify-between gap-2">
                              <div><p className="text-[11px] font-bold text-gray-800"><span className="text-indigo-600">{oc.outcome_code}</span> — {oc.outcome_description}</p></div>
                              <button onClick={() => handleDeleteOutcome(oc.id)} className="p-1 rounded text-gray-300 hover:text-red-500 transition"><FiTrash2 size={10} /></button>
                            </div>
                            {oc.rubric_ee && <div className="grid grid-cols-4 gap-1.5 mt-2">
                              {[{ k: 'EE', v: oc.rubric_ee }, { k: 'ME', v: oc.rubric_me }, { k: 'AE', v: oc.rubric_ae }, { k: 'BE', v: oc.rubric_be }].filter(r => r.v).map(r => (
                                <div key={r.k} className="px-2 py-1.5 rounded-lg text-[9px] font-bold border" style={{ background: RUBRIC[r.k].bg, color: RUBRIC[r.k].color, borderColor: RUBRIC[r.k].border }}>
                                  <span className="block font-black">{r.k}</span>{r.v}
                                </div>
                              ))}
                            </div>}
                          </div>
                        ))}
                        {ssOutcomes.length === 0 && <p className="text-[10px] text-gray-400 italic ml-2">No outcomes yet. Click + to add.</p>}
                      </div>}
                    </div>);
                  })}
                  {strandSubs.length === 0 && <p className="text-[10px] text-gray-400 italic px-3 py-2">No sub-strands yet.</p>}
                </div>}
              </div>);
            })}
            {areaStrands.length === 0 && <p className="text-[10px] text-gray-400 italic py-2">No strands yet. Click + Strand to add.</p>}
          </div>}
        </div>);
      })}
    </div>}

    {tab === 'tracking' && <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex flex-wrap items-center gap-3">
        <select value={trackStudent} onChange={e => setTrackStudent(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600">
          <option value="">Select Student</option>{students.slice(0, 100).map(s => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name} ({s.admission_number})</option>)}
        </select>
        <select value={trackTerm} onChange={e => setTrackTerm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600">
          <option value="">All Terms</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
        </select>
      </div></div>

      {trackStudent && <>{studentSummaries.length > 0 ? <div className="space-y-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">📊 Competency Summary by Strand</p>
        {studentSummaries.map(sum => {
          const strand = strands.find(s => s.id === sum.strand_id);
          const area = strand ? learningAreas.find(la => la.id === strand.learning_area_id) : null;
          const rubric = RUBRIC[sum.overall_level || 'ME'];
          const pct = sum.competency_percentage || 0;
          return (<div key={sum.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div><p className="text-xs font-bold text-gray-800">{area?.area_name} → {strand?.strand_name}</p><p className="text-[10px] text-gray-400">{sum.total_outcomes} outcomes assessed</p></div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold border" style={{ background: rubric.bg, color: rubric.color, borderColor: rubric.border }}>{sum.overall_level} — {rubric.label}</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${rubric.color}, ${rubric.color}88)` }} />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[{ k: 'EE', v: sum.ee_count }, { k: 'ME', v: sum.me_count }, { k: 'AE', v: sum.ae_count }, { k: 'BE', v: sum.be_count }].map(r => (
                <div key={r.k} className="text-center p-2 rounded-lg border" style={{ background: RUBRIC[r.k].bg, borderColor: RUBRIC[r.k].border }}>
                  <p className="text-lg font-black" style={{ color: RUBRIC[r.k].color }}>{r.v || 0}</p>
                  <p className="text-[9px] font-bold" style={{ color: RUBRIC[r.k].color }}>{r.k}</p>
                </div>
              ))}
            </div>
          </div>);
        })}
      </div> : <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center"><span className="text-4xl block mb-2">📋</span><p className="text-sm text-gray-500">No competency data yet for this student.</p><p className="text-xs text-gray-400 mt-1">Use CBC Assessment Entry to record rubric ratings.</p></div>}</>}

      {!trackStudent && <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>📊</div>
        <h3 className="text-lg font-bold text-gray-800">Student Competency Tracking</h3>
        <p className="text-sm text-gray-500 mt-2">Select a student above to view their CBC competency progress across all learning areas and strands.</p>
      </div>}
    </div>}

    {tab === 'reports' && <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#eef2ff,#c7d2fe)' }}>📈</div>
      <h3 className="text-lg font-bold text-gray-800">CBC Competency Reports</h3>
      <p className="text-sm text-gray-500 mt-2">Class-wide and school-wide competency analysis reports will appear here as assessment data is recorded.</p>
      <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mt-6">
        {[{ e: '📊', l: 'Class Summary' }, { e: '🎯', l: 'Strand Analysis' }, { e: '👨‍🎓', l: 'Student Report' }].map(r => (
          <div key={r.l} className="p-4 rounded-xl bg-gray-50 border border-gray-100"><span className="text-2xl block mb-1">{r.e}</span><p className="text-[10px] font-bold text-gray-500">{r.l}</p></div>
        ))}
      </div>
    </div>}

    {/* Area Modal */}
    {showAreaModal && <div className="modal-overlay" onClick={() => setShowAreaModal(false)}><div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}><div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/><h2 className="text-lg font-bold text-white">📖 Add Learning Area</h2><button onClick={() => setShowAreaModal(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button></div>
      <div className="p-6 space-y-4">
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Name *</label><input value={areaForm.area_name} onChange={e => setAreaForm({ ...areaForm, area_name: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400" placeholder="e.g. Mathematics" /></div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Code</label><input value={areaForm.area_code} onChange={e => setAreaForm({ ...areaForm, area_code: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-400" placeholder="e.g. MATH" /></div>
      </div>
      <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50"><button onClick={() => setShowAreaModal(false)} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14} /> Cancel</button><button onClick={handleSaveArea} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>{saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FiSave size={14} />}✅ Save</button></div>
    </div></div>}

    {/* Strand Modal */}
    {showStrandModal && <div className="modal-overlay" onClick={() => setShowStrandModal(false)}><div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}><div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/><h2 className="text-lg font-bold text-white">🔗 Add Strand</h2><button onClick={() => setShowStrandModal(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button></div>
      <div className="p-6 space-y-4">
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Learning Area</label><select value={strandForm.learning_area_id} onChange={e => setStrandForm({ ...strandForm, learning_area_id: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400">{learningAreas.map(a => <option key={a.id} value={a.id}>{a.area_name}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Strand Name *</label><input value={strandForm.strand_name} onChange={e => setStrandForm({ ...strandForm, strand_name: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-400" placeholder="e.g. Numbers" /></div>
      </div>
      <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50"><button onClick={() => setShowStrandModal(false)} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14} /> Cancel</button><button onClick={handleSaveStrand} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)' }}>{saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FiSave size={14} />}✅ Save</button></div>
    </div></div>}

    {/* Sub-Strand Modal */}
    {showSubStrandModal && <div className="modal-overlay" onClick={() => setShowSubStrandModal(false)}><div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
      <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' }}><div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/><h2 className="text-lg font-bold text-white">📂 Add Sub-Strand</h2><button onClick={() => setShowSubStrandModal(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button></div>
      <div className="p-6 space-y-4">
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Strand</label><select value={subStrandForm.strand_id} onChange={e => setSubStrandForm({ ...subStrandForm, strand_id: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400">{strands.map(s => <option key={s.id} value={s.id}>{s.strand_name}</option>)}</select></div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Sub-Strand Name *</label><input value={subStrandForm.sub_strand_name} onChange={e => setSubStrandForm({ ...subStrandForm, sub_strand_name: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400" placeholder="e.g. Whole Numbers" /></div>
      </div>
      <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50"><button onClick={() => setShowSubStrandModal(false)} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14} /> Cancel</button><button onClick={handleSaveSubStrand} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{ background: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' }}>{saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FiSave size={14} />}✅ Save</button></div>
    </div></div>}

    {/* Outcome Modal */}
    {showOutcomeModal && <div className="modal-overlay" onClick={() => setShowOutcomeModal(false)}><div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
      <div className="px-6 py-5 flex items-center justify-between relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}><div className="absolute right-0 top-0 w-32 h-32 rounded-full -translate-y-10 translate-x-10 opacity-10 bg-white"/><h2 className="text-lg font-bold text-white">🎯 Add Learning Outcome</h2><button onClick={() => setShowOutcomeModal(false)} className="p-2 rounded-xl bg-white/20 text-white hover:bg-white/30 transition"><FiX size={18} /></button></div>
      <div className="p-6 space-y-4 max-h-[72vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Sub-Strand *</label><select value={outcomeForm.sub_strand_id} onChange={e => setOutcomeForm({ ...outcomeForm, sub_strand_id: Number(e.target.value) })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"><option value={0}>Select</option>{subStrands.map(ss => <option key={ss.id} value={ss.id}>{ss.sub_strand_name}</option>)}</select></div>
          <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Outcome Code *</label><input value={outcomeForm.outcome_code} onChange={e => setOutcomeForm({ ...outcomeForm, outcome_code: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" placeholder="e.g. MATH-NUM-WN-01" /></div>
        </div>
        <div><label className="text-xs font-bold text-gray-600 mb-1 block uppercase tracking-wider">Description *</label><textarea value={outcomeForm.outcome_description} onChange={e => setOutcomeForm({ ...outcomeForm, outcome_description: e.target.value })} className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400" rows={2} placeholder="What the learner should demonstrate…" /></div>
        <hr className="border-gray-100" />
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">📋 Rubric Descriptors</p>
        <div className="space-y-3">
          {[{ k: 'EE', l: '🟢 Exceeding Expectations', f: 'rubric_ee' }, { k: 'ME', l: '🔵 Meeting Expectations', f: 'rubric_me' }, { k: 'AE', l: '🟡 Approaching Expectations', f: 'rubric_ae' }, { k: 'BE', l: '🔴 Below Expectations', f: 'rubric_be' }].map(r => (
            <div key={r.k}><label className="text-xs font-bold mb-1 block" style={{ color: RUBRIC[r.k].color }}>{r.l}</label><input value={(outcomeForm as any)[r.f]} onChange={e => setOutcomeForm({ ...outcomeForm, [r.f]: e.target.value })} className="w-full px-3 py-2 bg-white border rounded-xl text-sm focus:outline-none" style={{ borderColor: RUBRIC[r.k].border }} placeholder={`Description for ${r.k} level…`} /></div>
          ))}
        </div>
      </div>
      <div className="p-6 border-t border-gray-100 flex gap-3 justify-end bg-gray-50/50"><button onClick={() => setShowOutcomeModal(false)} className="btn-outline flex items-center gap-2 text-sm"><FiX size={14} /> Cancel</button><button onClick={handleSaveOutcome} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FiSave size={14} />}✅ Save Outcome</button></div>
    </div></div>}
  </div>);
}

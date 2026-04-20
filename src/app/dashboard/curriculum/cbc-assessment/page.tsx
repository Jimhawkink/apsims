'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSave, FiX, FiRefreshCw, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

const RUBRIC: Record<string, { label: string; color: string; bg: string; border: string }> = {
  EE: { label: 'Exceeding Expectations', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
  ME: { label: 'Meeting Expectations', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' },
  AE: { label: 'Approaching Expectations', color: '#b45309', bg: '#fffbeb', border: '#fde68a' },
  BE: { label: 'Below Expectations', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' },
};
const RUBRIC_KEYS = ['EE', 'ME', 'AE', 'BE'];

export default function CBCAssessmentPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [strands, setStrands] = useState<any[]>([]);
  const [subStrands, setSubStrands] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [existingAssessments, setExistingAssessments] = useState<any[]>([]);

  const [selArea, setSelArea] = useState('');
  const [selTerm, setSelTerm] = useState('');
  const [selForm, setSelForm] = useState('');
  const [assessType, setAssessType] = useState('formative');

  // Per-student per-outcome rubric ratings
  const [ratings, setRatings] = useState<Record<string, string>>({}); // key: `${studentId}-${outcomeId}`

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [s, la, st, ss, oc, te, forms] = await Promise.all([
      supabase.from('school_students').select('id, first_name, last_name, admission_number, form_id').eq('is_active', true).order('last_name'),
      supabase.from('school_cbc_learning_areas').select('*').order('sort_order'),
      supabase.from('school_cbc_strands').select('*').order('sort_order'),
      supabase.from('school_cbc_sub_strands').select('*').order('sort_order'),
      supabase.from('school_cbc_learning_outcomes').select('*').order('sort_order'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_forms').select('*').order('form_level'),
    ]);
    setStudents(s.data || []);
    setLearningAreas(la.data || []);
    setStrands(st.data || []);
    setSubStrands(ss.data || []);
    setOutcomes(oc.data || []);
    setTerms(te.data || []);
    if (te.data?.length) setSelTerm(String(te.data[0].id));
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load existing assessments when filters change
  useEffect(() => {
    if (!selArea || !selTerm) return;
    const loadExisting = async () => {
      const areaStrandIds = strands.filter(s => s.learning_area_id === Number(selArea)).map(s => s.id);
      const areaSubStrandIds = subStrands.filter(ss => areaStrandIds.includes(ss.strand_id)).map(ss => ss.id);
      const areaOutcomeIds = outcomes.filter(o => areaSubStrandIds.includes(o.sub_strand_id)).map(o => o.id);

      if (areaOutcomeIds.length === 0) return;

      const { data } = await supabase.from('school_cbc_assessments')
        .select('*')
        .in('learning_outcome_id', areaOutcomeIds)
        .eq('term_id', Number(selTerm))
        .eq('assessment_type', assessType);

      if (data) {
        setExistingAssessments(data);
        const map: Record<string, string> = {};
        data.forEach(a => { map[`${a.student_id}-${a.learning_outcome_id}`] = a.rubric_level; });
        setRatings(prev => ({ ...prev, ...map }));
      }
    };
    loadExisting();
  }, [selArea, selTerm, assessType, strands, subStrands, outcomes]);

  const filteredOutcomes = useMemo(() => {
    if (!selArea) return [];
    const areaStrandIds = strands.filter(s => s.learning_area_id === Number(selArea)).map(s => s.id);
    const areaSubStrandIds = subStrands.filter(ss => areaStrandIds.includes(ss.strand_id)).map(ss => ss.id);
    return outcomes.filter(o => areaSubStrandIds.includes(o.sub_strand_id));
  }, [selArea, strands, subStrands, outcomes]);

  const filteredStudents = useMemo(() => {
    if (!selForm) return students.slice(0, 30);
    return students.filter(s => s.form_id === Number(selForm)).slice(0, 50);
  }, [students, selForm]);

  const setRating = (studentId: number, outcomeId: number, level: string) => {
    setRatings(prev => ({ ...prev, [`${studentId}-${outcomeId}`]: level }));
  };

  const handleSave = async () => {
    if (!selTerm || !selArea) { toast.error('Select term and learning area'); return; }
    setSaving(true);
    let saved = 0, updated = 0;

    for (const student of filteredStudents) {
      for (const outcome of filteredOutcomes) {
        const key = `${student.id}-${outcome.id}`;
        const level = ratings[key];
        if (!level) continue;

        const existing = existingAssessments.find(a => a.student_id === student.id && a.learning_outcome_id === outcome.id && a.term_id === Number(selTerm) && a.assessment_type === assessType);

        if (existing) {
          if (existing.rubric_level !== level) {
            const { error } = await supabase.from('school_cbc_assessments').update({ rubric_level: level, updated_at: new Date().toISOString() }).eq('id', existing.id);
            if (!error) updated++;
          }
        } else {
          const { error } = await supabase.from('school_cbc_assessments').insert([{
            student_id: student.id, learning_outcome_id: outcome.id,
            term_id: Number(selTerm), assessment_type: assessType,
            rubric_level: level, assessed_by: 'admin',
          }]);
          if (!error) saved++;
        }
      }
    }

    toast.success(`✅ ${saved} new + ${updated} updated assessments saved!`);

    // Recompute summaries
    await computeSummaries();
    setSaving(false);
  };

  const computeSummaries = async () => {
    const termId = Number(selTerm);
    for (const strand of strands.filter(s => s.learning_area_id === Number(selArea))) {
      const strandSubStrandIds = subStrands.filter(ss => ss.strand_id === strand.id).map(ss => ss.id);
      const strandOutcomeIds = outcomes.filter(o => strandSubStrandIds.includes(o.sub_strand_id)).map(o => o.id);
      if (strandOutcomeIds.length === 0) continue;

      for (const student of filteredStudents) {
        const stuAssessments = existingAssessments.filter(a =>
          a.student_id === student.id && strandOutcomeIds.includes(a.learning_outcome_id) && a.term_id === termId
        );
        // Also include newly saved ones from ratings
        for (const oid of strandOutcomeIds) {
          const key = `${student.id}-${oid}`;
          if (ratings[key] && !stuAssessments.find(a => a.learning_outcome_id === oid)) {
            stuAssessments.push({ student_id: student.id, learning_outcome_id: oid, rubric_level: ratings[key] });
          }
        }

        const total = stuAssessments.length;
        if (total === 0) continue;
        const ee = stuAssessments.filter(a => a.rubric_level === 'EE').length;
        const me = stuAssessments.filter(a => a.rubric_level === 'ME').length;
        const ae = stuAssessments.filter(a => a.rubric_level === 'AE').length;
        const be = stuAssessments.filter(a => a.rubric_level === 'BE').length;
        const pct = Math.round(((ee + me) / total) * 10000) / 100;
        const overall = ee + me >= ae + be ? (ee > me ? 'EE' : 'ME') : (ae > be ? 'AE' : 'BE');

        const { error } = await supabase.from('school_cbc_competency_summary').upsert({
          student_id: student.id, strand_id: strand.id, term_id: termId,
          total_outcomes: total, ee_count: ee, me_count: me, ae_count: ae, be_count: be,
          competency_percentage: pct, overall_level: overall, updated_at: new Date().toISOString(),
        }, { onConflict: 'student_id,strand_id,term_id' });
      }
    }
  };

  const getOutcomeSubStrand = (ssId: number) => subStrands.find(ss => ss.id === ssId);
  const getOutcomeStrand = (ssId: number) => {
    const ss = subStrands.find(s => s.id === ssId);
    return ss ? strands.find(s => s.id === ss.strand_id) : null;
  };

  if (loading) return (<div className="flex flex-col items-center justify-center h-64 gap-3"><div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>📋</div><p className="text-sm font-bold text-gray-500">Loading Assessment Entry…</p></div>);

  return (<div className="animate-fadeIn space-y-5">
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div><h1 className="text-2xl font-extrabold text-gray-900" style={{ fontFamily: 'Outfit,sans-serif', letterSpacing: '-0.03em' }}>📋 CBC Assessment Entry</h1><p className="text-sm text-gray-500 mt-1">Record rubric-based competency assessments per student</p></div>
      <div className="flex items-center gap-2">
        <button onClick={fetchAll} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-amber-600 hover:border-amber-200 transition"><FiRefreshCw size={15} /></button>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>{saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : <FiSave size={14} />}💾 Save All</button>
      </div>
    </div>

    {/* Filters */}
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><div className="flex flex-wrap items-center gap-3">
      <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600">
        <option value="">Select Term *</option>{terms.map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
      </select>
      <select value={selArea} onChange={e => setSelArea(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600">
        <option value="">Select Learning Area *</option>{learningAreas.map(a => <option key={a.id} value={a.id}>{a.area_name}</option>)}
      </select>
      <select value={selForm} onChange={e => setSelForm(e.target.value)} className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none text-gray-600">
        <option value="">All Forms</option><option value="1">Form 1</option><option value="2">Form 2</option><option value="3">Form 3</option><option value="4">Form 4</option>
      </select>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {[{ v: 'formative', l: '📝 Formative' }, { v: 'summative', l: '🏆 Summative' }, { v: 'observation', l: '👁 Observation' }].map(t => (
          <button key={t.v} onClick={() => setAssessType(t.v)} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${assessType === t.v ? 'bg-white shadow text-indigo-700' : 'text-gray-500 hover:text-gray-700'}`}>{t.l}</button>
        ))}
      </div>
      <p className="ml-auto text-xs font-bold text-gray-400">{filteredStudents.length} students · {filteredOutcomes.length} outcomes</p>
    </div></div>

    {selArea && filteredOutcomes.length > 0 ? (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ fontSize: 11 }}>
            <thead>
              <tr>
                <th className="text-left px-3 py-3 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap sticky left-0 z-10" style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0', minWidth: 160 }}>👨‍🎓 Student</th>
                {filteredOutcomes.map(oc => (
                  <th key={oc.id} className="text-center px-2 py-3 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ background: '#f8fafc', color: '#475569', borderBottom: '2px solid #e2e8f0', minWidth: 80 }}>
                    <span className="block text-indigo-600">{oc.outcome_code}</span>
                    <span className="block text-gray-400 font-normal normal-case mt-0.5 max-w-[100px] truncate">{oc.outcome_description}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map(student => (
                <tr key={student.id} className="transition-colors" style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td className="px-3 py-2 sticky left-0 z-10 bg-white" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>{(student.first_name?.[0] || '') + (student.last_name?.[0] || '')}</div>
                      <div><p className="text-xs font-bold text-gray-900 whitespace-nowrap">{student.last_name}, {student.first_name}</p><p className="text-[9px] text-gray-400">{student.admission_number}</p></div>
                    </div>
                  </td>
                  {filteredOutcomes.map(oc => {
                    const key = `${student.id}-${oc.id}`;
                    const current = ratings[key] || '';
                    return (
                      <td key={oc.id} className="px-1 py-1.5 text-center">
                        <div className="flex justify-center gap-0.5">
                          {RUBRIC_KEYS.map(level => {
                            const r = RUBRIC[level];
                            const isActive = current === level;
                            return (
                              <button key={level} onClick={() => setRating(student.id, oc.id, isActive ? '' : level)}
                                className={`w-6 h-6 rounded-md text-[9px] font-black transition-all ${isActive ? 'shadow-sm scale-110' : 'opacity-40 hover:opacity-70'}`}
                                style={{ background: isActive ? r.bg : '#f8fafc', color: isActive ? r.color : '#94a3b8', border: `1.5px solid ${isActive ? r.border : '#e2e8f0'}` }}
                                title={`${level} - ${r.label}`}>
                                {level}
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredStudents.length === 0 && <div className="text-center py-12 text-gray-400"><span className="text-4xl block mb-2">👨‍🎓</span><p className="text-sm">No students found for the selected form</p></div>}
      </div>
    ) : (
      <div className="bg-white rounded-2xl p-12 border border-gray-100 shadow-sm text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4" style={{ background: 'linear-gradient(135deg,#fffbeb,#fef3c7)' }}>📋</div>
        <h3 className="text-lg font-bold text-gray-800">CBC Rubric Assessment Entry</h3>
        <p className="text-sm text-gray-500 mt-2">Select a <strong>Term</strong> and <strong>Learning Area</strong> above to begin entering rubric ratings (EE/ME/AE/BE) for each student and learning outcome.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          {RUBRIC_KEYS.map(k => (
            <div key={k} className="px-4 py-2 rounded-xl border-2" style={{ background: RUBRIC[k].bg, borderColor: RUBRIC[k].border }}>
              <span className="text-lg font-black block" style={{ color: RUBRIC[k].color }}>{k}</span>
              <span className="text-[9px] font-bold block" style={{ color: RUBRIC[k].color }}>{RUBRIC[k].label}</span>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>);
}

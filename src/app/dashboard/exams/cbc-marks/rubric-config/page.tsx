'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import CBCNavBar from '@/components/cbc/CBCNavBar';
import toast from 'react-hot-toast';
import {
  FiSettings, FiSave, FiRefreshCw, FiPlus, FiTrash2,
  FiAlertTriangle, FiCheckCircle, FiEdit3, FiCopy,
  FiSliders, FiBook, FiInfo, FiTarget, FiShield,
} from 'react-icons/fi';

const RC = {
  EE: { bar: '#1D9E75', text: '#0F6E56', bg: '#E1F5EE', label: 'Exceeds Expectation' },
  ME: { bar: '#378ADD', text: '#185FA5', bg: '#E6F1FB', label: 'Meets Expectation' },
  AE: { bar: '#EF9F27', text: '#854F0B', bg: '#FAEEDA', label: 'Approaches Expectation' },
  BE: { bar: '#E24B4A', text: '#A32D2D', bg: '#FCEBEB', label: 'Below Expectation' },
};

interface ThresholdRow {
  id?: number;
  subject_id: number | null;
  rubric_level: string;
  min_score: number;
  max_score: number;
  is_global: boolean;
  isDirty?: boolean;
}

export default function RubricConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<ThresholdRow[]>([]);
  const [rubricConfig, setRubricConfig] = useState<any[]>([]);
  const [selSubject, setSelSubject] = useState<'global' | string>('global');
  const [editMode, setEditMode] = useState(false);

  // Editable state
  const [editThresholds, setEditThresholds] = useState<Record<string, { min: string; max: string }>>({
    EE: { min: '80', max: '100' },
    ME: { min: '60', max: '79' },
    AE: { min: '40', max: '59' },
    BE: { min: '0', max: '39' },
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [subjectsRes, thresholdsRes, rubricRes] = await Promise.all([
      supabase.from('school_subjects').select('*').eq('is_active', true).order('subject_name'),
      supabase.from('cbc_rubric_thresholds').select('*').order('min_score', { ascending: false }),
      supabase.from('cbc_rubric_config').select('*').order('sort_order'),
    ]);
    setSubjects(subjectsRes.data || []);
    setThresholds(thresholdsRes.data || []);
    setRubricConfig(rubricRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Load thresholds for selected subject
  useEffect(() => {
    if (selSubject === 'global') {
      const globals = thresholds.filter(t => t.is_global || t.subject_id === null);
      const map: Record<string, { min: string; max: string }> = {};
      (['EE', 'ME', 'AE', 'BE'] as const).forEach(lvl => {
        const t = globals.find(g => g.rubric_level === lvl);
        map[lvl] = { min: t ? String(t.min_score) : (lvl === 'EE' ? '80' : lvl === 'ME' ? '60' : lvl === 'AE' ? '40' : '0'), max: t ? String(t.max_score) : (lvl === 'EE' ? '100' : lvl === 'ME' ? '79' : lvl === 'AE' ? '59' : '39') };
      });
      setEditThresholds(map);
    } else {
      const subjectThresholds = thresholds.filter(t => String(t.subject_id) === selSubject);
      if (subjectThresholds.length > 0) {
        const map: Record<string, { min: string; max: string }> = {};
        (['EE', 'ME', 'AE', 'BE'] as const).forEach(lvl => {
          const t = subjectThresholds.find(st => st.rubric_level === lvl);
          map[lvl] = t ? { min: String(t.min_score), max: String(t.max_score) } : { min: '', max: '' };
        });
        setEditThresholds(map);
      } else {
        // Inherit from global
        const globals = thresholds.filter(t => t.is_global || t.subject_id === null);
        const map: Record<string, { min: string; max: string }> = {};
        (['EE', 'ME', 'AE', 'BE'] as const).forEach(lvl => {
          const t = globals.find(g => g.rubric_level === lvl);
          map[lvl] = { min: t ? String(t.min_score) : '', max: t ? String(t.max_score) : '' };
        });
        setEditThresholds(map);
      }
    }
    setEditMode(false);
  }, [selSubject, thresholds]);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    const levels = ['EE', 'ME', 'AE', 'BE'];

    for (const lvl of levels) {
      const min = parseFloat(editThresholds[lvl]?.min);
      const max = parseFloat(editThresholds[lvl]?.max);
      if (isNaN(min) || isNaN(max)) { errors.push(`${lvl}: Invalid values`); continue; }
      if (min < 0 || max > 100) errors.push(`${lvl}: Must be 0–100`);
      if (min > max) errors.push(`${lvl}: Min > Max`);
    }

    // Check for gaps/overlaps
    const ranges = levels.map(lvl => ({
      level: lvl,
      min: parseFloat(editThresholds[lvl]?.min) || 0,
      max: parseFloat(editThresholds[lvl]?.max) || 0,
    })).sort((a, b) => a.min - b.min);

    for (let i = 0; i < ranges.length - 1; i++) {
      if (ranges[i].max >= ranges[i + 1].min) {
        errors.push(`${ranges[i].level} and ${ranges[i + 1].level} overlap`);
      }
      if (ranges[i].max + 1 < ranges[i + 1].min) {
        errors.push(`Gap between ${ranges[i].level} and ${ranges[i + 1].level}`);
      }
    }

    if (ranges[0]?.min !== 0) errors.push('Lowest range should start at 0');
    if (ranges[ranges.length - 1]?.max !== 100) errors.push('Highest range should end at 100');

    return errors;
  }, [editThresholds]);

  const handleSave = async () => {
    if (validationErrors.length > 0) {
      toast.error('Fix validation errors before saving');
      return;
    }

    setSaving(true);
    try {
      const subjectId = selSubject === 'global' ? null : Number(selSubject);
      const isGlobal = selSubject === 'global';

      for (const lvl of ['EE', 'ME', 'AE', 'BE']) {
        const minScore = parseFloat(editThresholds[lvl].min);
        const maxScore = parseFloat(editThresholds[lvl].max);

        await supabase.from('cbc_rubric_thresholds').upsert({
          subject_id: subjectId,
          rubric_level: lvl,
          min_score: minScore,
          max_score: maxScore,
          is_global: isGlobal,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'subject_id,rubric_level' });
      }

      toast.success('Thresholds saved successfully');
      setEditMode(false);
      await fetchAll();
    } catch (err) {
      toast.error('Failed to save thresholds');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyGlobalToSubject = async () => {
    if (selSubject === 'global') return;
    const globals = thresholds.filter(t => t.is_global || t.subject_id === null);
    const map: Record<string, { min: string; max: string }> = {};
    (['EE', 'ME', 'AE', 'BE'] as const).forEach(lvl => {
      const t = globals.find(g => g.rubric_level === lvl);
      map[lvl] = { min: t ? String(t.min_score) : '0', max: t ? String(t.max_score) : '100' };
    });
    setEditThresholds(map);
    setEditMode(true);
    toast.success('Global thresholds copied — edit and save');
  };

  const handleDeleteSubjectThresholds = async () => {
    if (selSubject === 'global') return;
    const { error } = await supabase.from('cbc_rubric_thresholds').delete().eq('subject_id', Number(selSubject));
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Subject thresholds removed — will inherit global');
    await fetchAll();
  };

  // Subjects with custom thresholds
  const customSubjects = useMemo(() => {
    const subjectIds = new Set(thresholds.filter(t => t.subject_id !== null && !t.is_global).map(t => t.subject_id));
    return subjects.filter(s => subjectIds.has(s.id));
  }, [subjects, thresholds]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3, borderStyle: 'solid' }} />
          <p className="text-gray-400 text-sm">Loading Rubric Configuration...</p>
        </div>
      </div>
    );
  }

  const hasSubjectOverride = selSubject !== 'global' && thresholds.some(t => String(t.subject_id) === selSubject);

  return (
    <div className="animate-fade-in">
      <CBCNavBar activeTab="rubric-config" breadcrumbEnd="Rubric Configuration" />

      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FiSettings size={22} className="text-indigo-500" />
              Rubric Threshold Configuration
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure score ranges for EE/ME/AE/BE rubric levels. Set global defaults or customize per subject.
            </p>
          </div>
          <div className="flex gap-2">
            {editMode && (
              <button onClick={handleSave} disabled={saving || validationErrors.length > 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-all"
                style={{ background: '#00D9A6' }}>
                <FiSave size={13} /> {saving ? 'Saving...' : 'Save Thresholds'}
              </button>
            )}
            <button onClick={() => setEditMode(!editMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${editMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
              <FiEdit3 size={13} /> {editMode ? 'Cancel Edit' : 'Edit Mode'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ── Left: Subject Selector ── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Global */}
            <div onClick={() => setSelSubject('global')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${selSubject === 'global' ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <FiShield size={16} className={selSubject === 'global' ? 'text-indigo-600' : 'text-gray-400'} />
                <div>
                  <p className={`text-xs font-bold ${selSubject === 'global' ? 'text-indigo-700' : 'text-gray-800'}`}>Global Defaults</p>
                  <p className="text-[10px] text-gray-400">Applied to all subjects without custom config</p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
              Custom Overrides ({customSubjects.length})
            </div>

            {customSubjects.map(sub => (
              <div key={sub.id} onClick={() => setSelSubject(String(sub.id))}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${String(sub.id) === selSubject ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  <FiBook size={14} className={String(sub.id) === selSubject ? 'text-indigo-600' : 'text-gray-400'} />
                  <p className={`text-xs font-semibold ${String(sub.id) === selSubject ? 'text-indigo-700' : 'text-gray-800'}`}>{sub.subject_name}</p>
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700">Custom</span>
                </div>
              </div>
            ))}

            {/* Add subject override */}
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider pt-2">
              Add Subject Override
            </div>
            <select onChange={e => { if (e.target.value) { setSelSubject(e.target.value); setEditMode(true); } }} value=""
              className="w-full py-2 px-2.5 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500 cursor-pointer hover:border-indigo-300">
              <option value="">Select a subject...</option>
              {subjects.filter(s => !customSubjects.some(cs => cs.id === s.id)).map(s => (
                <option key={s.id} value={s.id}>{s.subject_name}</option>
              ))}
            </select>
          </div>

          {/* ── Right: Threshold Editor ── */}
          <div className="lg:col-span-3 space-y-5">
            {/* Current config header */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <FiSliders className="text-indigo-500" />
                  {selSubject === 'global' ? 'Global Threshold Configuration' : `${subjects.find(s => s.id === Number(selSubject))?.subject_name || ''} — Custom Thresholds`}
                </h3>
                <div className="flex gap-2">
                  {selSubject !== 'global' && !hasSubjectOverride && (
                    <button onClick={handleCopyGlobalToSubject} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100">
                      <FiCopy size={11} /> Copy from Global
                    </button>
                  )}
                  {selSubject !== 'global' && hasSubjectOverride && (
                    <button onClick={handleDeleteSubjectThresholds} className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium text-red-600 bg-red-50 hover:bg-red-100">
                      <FiTrash2 size={11} /> Remove Override
                    </button>
                  )}
                </div>
              </div>

              <div className="p-5">
                {/* Info banner */}
                {selSubject !== 'global' && !hasSubjectOverride && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-800 mb-5">
                    <FiInfo size={14} className="flex-shrink-0 mt-0.5" />
                    <span>This subject uses <b>global defaults</b>. Click "Copy from Global" to create a custom override, then adjust the ranges.</span>
                  </div>
                )}

                {/* Threshold Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['EE', 'ME', 'AE', 'BE'] as const).map(lvl => {
                    const c = RC[lvl];
                    const vals = editThresholds[lvl] || { min: '', max: '' };
                    return (
                      <div key={lvl} className="rounded-xl border-2 p-4 transition-all" style={{ borderColor: editMode ? c.bar : '#e5e7eb', backgroundColor: editMode ? c.bg + '44' : '#fafafa' }}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ backgroundColor: c.bar }}>
                              {lvl}
                            </span>
                            <div>
                              <p className="text-xs font-bold" style={{ color: c.text }}>{c.label}</p>
                              <p className="text-[10px] text-gray-400">Score range</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase">Min Score</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={vals.min}
                              onChange={e => setEditThresholds(prev => ({ ...prev, [lvl]: { ...prev[lvl], min: e.target.value } }))}
                              disabled={!editMode}
                              className="w-full mt-1 py-2 px-3 rounded-lg border text-sm font-bold text-center disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-2 transition-all"
                              style={{ borderColor: editMode ? c.bar : '#e5e7eb', color: editMode ? c.text : undefined }}
                            />
                          </div>
                          <span className="text-gray-300 text-lg font-light mt-4">—</span>
                          <div className="flex-1">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase">Max Score</label>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={vals.max}
                              onChange={e => setEditThresholds(prev => ({ ...prev, [lvl]: { ...prev[lvl], max: e.target.value } }))}
                              disabled={!editMode}
                              className="w-full mt-1 py-2 px-3 rounded-lg border text-sm font-bold text-center disabled:bg-gray-100 disabled:text-gray-500 focus:outline-none focus:ring-2 transition-all"
                              style={{ borderColor: editMode ? c.bar : '#e5e7eb', color: editMode ? c.text : undefined }}
                            />
                          </div>
                        </div>

                        {/* Visual range bar */}
                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden relative">
                          <div
                            className="h-full rounded-full absolute transition-all duration-300"
                            style={{
                              left: `${parseFloat(vals.min) || 0}%`,
                              width: `${Math.max(0, (parseFloat(vals.max) || 0) - (parseFloat(vals.min) || 0))}%`,
                              backgroundColor: c.bar,
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1">
                          <span className="text-[9px] text-gray-400">0</span>
                          <span className="text-[9px] text-gray-400">100</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Full range visualization */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Full Score Range Visualization</p>
                  <div className="h-8 rounded-lg overflow-hidden flex">
                    {(['BE', 'AE', 'ME', 'EE'] as const).map(lvl => {
                      const c = RC[lvl];
                      const vals = editThresholds[lvl] || { min: '0', max: '0' };
                      const width = Math.max(0, (parseFloat(vals.max) || 0) - (parseFloat(vals.min) || 0) + 1);
                      return (
                        <div key={lvl} className="flex items-center justify-center text-[10px] font-bold text-white transition-all duration-300"
                          style={{ width: `${width}%`, backgroundColor: c.bar, minWidth: width > 0 ? '30px' : '0' }}>
                          {width > 5 && `${lvl} (${vals.min}–${vals.max})`}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Validation errors */}
                {editMode && validationErrors.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-xs font-bold text-red-700 flex items-center gap-1 mb-1.5">
                      <FiAlertTriangle size={13} /> Validation Errors
                    </p>
                    {validationErrors.map((err, i) => (
                      <p key={i} className="text-[11px] text-red-600 ml-5">• {err}</p>
                    ))}
                  </div>
                )}

                {editMode && validationErrors.length === 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-green-50 border border-green-200">
                    <p className="text-xs font-semibold text-green-700 flex items-center gap-1">
                      <FiCheckCircle size={13} /> All ranges valid — ready to save
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

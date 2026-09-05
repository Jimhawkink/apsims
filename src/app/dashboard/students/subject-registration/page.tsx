'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getEducationSystem } from '@/lib/cbc-utils';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiSearch, FiRefreshCw, FiDownload, FiUsers, FiBook, FiCheckCircle,
  FiAlertTriangle, FiXCircle, FiEdit2, FiSave, FiX, FiFilter,
  FiLayers, FiGrid, FiAward, FiFileText, FiCheck, FiInfo,
  FiPlus, FiTrash2, FiUpload, FiBarChart2, FiStar, FiShield,
} from 'react-icons/fi';

// ── KCSE Groups (Kenya MoE Official) ─────────────────────────────────────────
const KCSE_GROUPS = [
  {
    no: 1, label: 'Group I — Languages', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5',
    badge: 'bg-red-100 text-red-700 border-red-200', icon: '📖',
    rule: 'Both compulsory', required: 2, maxPick: 2,
    subjects: [
      { code: '101', name: 'English Language', initials: 'ENG', compulsory: true },
      { code: '102', name: 'Kiswahili', initials: 'KSW', compulsory: true },
    ],
  },
  {
    no: 2, label: 'Group II — Mathematics & Sciences', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe',
    badge: 'bg-blue-100 text-blue-700 border-blue-200', icon: '🔬',
    rule: 'Mathematics compulsory + at least 1 science', required: 2, maxPick: 4,
    subjects: [
      { code: '121', name: 'Mathematics', initials: 'MAT', compulsory: true },
      { code: '231', name: 'Biology', initials: 'BIO', compulsory: false },
      { code: '232', name: 'Physics', initials: 'PHY', compulsory: false },
      { code: '233', name: 'Chemistry', initials: 'CHE', compulsory: false },
    ],
  },
  {
    no: 3, label: 'Group III — Humanities', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0',
    badge: 'bg-green-100 text-green-700 border-green-200', icon: '🌍',
    rule: 'At least 1 required', required: 1, maxPick: 3,
    subjects: [
      { code: '311', name: 'History & Government', initials: 'HIS', compulsory: false },
      { code: '312', name: 'Geography', initials: 'GEO', compulsory: false },
      { code: '313', name: 'C.R.E.', initials: 'CRE', compulsory: false },
      { code: '314', name: 'I.R.E.', initials: 'IRE', compulsory: false },
      { code: '315', name: 'H.R.E.', initials: 'HRE', compulsory: false },
    ],
  },
  {
    no: 4, label: 'Group IV — Technical & Applied', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa',
    badge: 'bg-orange-100 text-orange-700 border-orange-200', icon: '🔧',
    rule: 'Optional — up to 2', required: 0, maxPick: 2,
    subjects: [
      { code: '441', name: 'Home Science', initials: 'HSC', compulsory: false },
      { code: '442', name: 'Art & Design', initials: 'ART', compulsory: false },
      { code: '443', name: 'Agriculture', initials: 'AGR', compulsory: false },
      { code: '444', name: 'Woodwork', initials: 'WOO', compulsory: false },
      { code: '445', name: 'Metalwork', initials: 'MET', compulsory: false },
      { code: '446', name: 'Building Construction', initials: 'BLD', compulsory: false },
      { code: '447', name: 'Power Mechanics', initials: 'POW', compulsory: false },
      { code: '448', name: 'Electricity', initials: 'ELE', compulsory: false },
      { code: '449', name: 'Drawing & Design', initials: 'DRW', compulsory: false },
      { code: '450', name: 'Aviation Technology', initials: 'AVI', compulsory: false },
      { code: '451', name: 'Computer Studies', initials: 'COM', compulsory: false },
    ],
  },
  {
    no: 5, label: 'Group V — Languages & Creative', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff',
    badge: 'bg-purple-100 text-purple-700 border-purple-200', icon: '🎨',
    rule: 'Optional — up to 2', required: 0, maxPick: 2,
    subjects: [
      { code: '501', name: 'French', initials: 'FRE', compulsory: false },
      { code: '502', name: 'German', initials: 'GER', compulsory: false },
      { code: '503', name: 'Arabic', initials: 'ARA', compulsory: false },
      { code: '504', name: 'Kenya Sign Language', initials: 'KSL', compulsory: false },
      { code: '511', name: 'Music', initials: 'MUS', compulsory: false },
      { code: '565', name: 'Business Studies', initials: 'BST', compulsory: false },
    ],
  },
];

// All KCSE subject codes flat
const ALL_KCSE = KCSE_GROUPS.flatMap(g => g.subjects.map(s => ({ ...s, group_no: g.no, groupColor: g.color, groupBg: g.bg, groupBadge: g.badge })));

// ── Conflict Detection ──────────────────────────────────────────────────────
function detectConflicts844(selectedCodes: string[]): { severity: 'critical' | 'warning' | 'ok'; message: string }[] {
  const issues: { severity: 'critical' | 'warning' | 'ok'; message: string }[] = [];
  const total = selectedCodes.length;
  if (total < 7) issues.push({ severity: 'critical', message: `Only ${total} subjects — minimum is 7` });
  if (total > 9) issues.push({ severity: 'warning', message: `${total} subjects — maximum is 9` });
  if (!selectedCodes.includes('101')) issues.push({ severity: 'critical', message: 'English Language is compulsory' });
  if (!selectedCodes.includes('102')) issues.push({ severity: 'critical', message: 'Kiswahili is compulsory' });
  if (!selectedCodes.includes('121')) issues.push({ severity: 'critical', message: 'Mathematics is compulsory' });
  const sciences = ['231','232','233'].filter(c => selectedCodes.includes(c));
  if (sciences.length === 0) issues.push({ severity: 'critical', message: 'Must take at least 1 Science (Bio/Phy/Che)' });
  const humanities = ['311','312','313','314','315'].filter(c => selectedCodes.includes(c));
  if (humanities.length === 0) issues.push({ severity: 'critical', message: 'Must take at least 1 from Group III (Humanities)' });
  if (issues.length === 0 && total >= 7) issues.push({ severity: 'ok', message: 'Valid KCSE subject combination ✓' });
  return issues;
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KPI({ label, value, sub, icon, grad }: any) {
  return (
    <div className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg" style={{ background: grad }}>
      <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
      <div className="absolute -bottom-6 -left-2 w-28 h-28 rounded-full bg-white/5" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80 mb-1">{label}</p>
          <p className="text-4xl font-black">{value}</p>
          {sub && <p className="text-[11px] opacity-70 mt-1">{sub}</p>}
        </div>
        <span className="text-3xl opacity-80">{icon}</span>
      </div>
    </div>
  );
}

// ── Group Badge ───────────────────────────────────────────────────────────────
function GBadge({ code, name, groupBadge }: any) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold border ${groupBadge}`}>
      {name || code}
    </span>
  );
}

// ── Subject Selector Modal ────────────────────────────────────────────────────
function SubjectModal({ student, existing, schoolSubjects, onSave, onClose, saving }: any) {
  const [selected, setSelected] = useState<string[]>(() => {
    // Pre-populate from existing registrations
    if (existing && existing.length > 0) {
      return existing.map((e: any) => {
        const sub = schoolSubjects.find((s: any) => s.id === e.subject_id);
        return sub?.subject_code || '';
      }).filter(Boolean);
    }
    // Default: English, Kiswahili, Mathematics pre-checked
    return ['101', '102', '121'];
  });

  const toggle = (code: string, compulsory: boolean) => {
    if (compulsory) return; // Can't uncheck compulsory
    setSelected(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const conflicts = detectConflicts844(selected);
  const hasErrors = conflicts.some(c => c.severity === 'critical');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">KCSE Subject Registration</p>
              <h2 className="text-xl font-black mt-0.5">{student?.first_name} {student?.last_name}</h2>
              <p className="text-xs opacity-70 mt-0.5">{student?.admission_no || student?.admission_number}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <FiX size={16}/>
            </button>
          </div>
          {/* Subject count bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{
                width: `${Math.min(100, (selected.length / 9) * 100)}%`,
                background: selected.length < 7 ? '#ef4444' : selected.length <= 9 ? '#22c55e' : '#f59e0b'
              }}/>
            </div>
            <span className="text-sm font-black">{selected.length}<span className="font-normal opacity-70">/9</span></span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${selected.length < 7 ? 'bg-red-500/30 text-red-100' : selected.length <= 9 ? 'bg-green-500/30 text-green-100' : 'bg-amber-500/30 text-amber-100'}`}>
              {selected.length < 7 ? `Need ${7 - selected.length} more` : selected.length <= 9 ? 'Valid' : 'Too many'}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Conflict alerts */}
          {conflicts.map((c, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-xl border text-sm font-semibold ${
              c.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
              c.severity === 'warning'  ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-green-50 border-green-200 text-green-700'
            }`}>
              {c.severity === 'critical' ? <FiXCircle size={14} className="mt-0.5 flex-shrink-0"/> :
               c.severity === 'warning'  ? <FiAlertTriangle size={14} className="mt-0.5 flex-shrink-0"/> :
               <FiCheckCircle size={14} className="mt-0.5 flex-shrink-0"/>}
              {c.message}
            </div>
          ))}

          {/* Groups */}
          {KCSE_GROUPS.map(group => (
            <div key={group.no} className="border rounded-2xl overflow-hidden" style={{ borderColor: group.border }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: group.bg }}>
                <span className="text-lg">{group.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black" style={{ color: group.color }}>{group.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{group.rule}</p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: group.color, color: '#fff' }}>
                  {group.subjects.filter(s => selected.includes(s.code)).length}/{group.subjects.length}
                </span>
              </div>
              <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                {group.subjects.map(sub => {
                  const checked = selected.includes(sub.code);
                  const isComp = sub.compulsory;
                  return (
                    <label key={sub.code} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isComp
                        ? 'bg-gray-50 border-gray-200 cursor-not-allowed'
                        : checked
                          ? 'border-2 shadow-sm'
                          : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                    }`} style={checked && !isComp ? { borderColor: group.color, background: group.bg } : {}}>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        checked
                          ? 'border-transparent'
                          : 'border-gray-300 bg-white'
                      }`} style={checked ? { background: group.color } : {}}>
                        {checked && <FiCheck size={11} color="#fff" strokeWidth={3}/>}
                      </div>
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => toggle(sub.code, isComp)} disabled={isComp}/>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800">{sub.name}</p>
                        <p className="text-[10px] text-gray-400">Code: {sub.code} · {sub.initials}</p>
                      </div>
                      {isComp && <span className="text-[9px] font-black text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">CORE</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 flex items-center justify-between gap-3 flex-shrink-0 bg-gray-50">
          <div className="text-xs text-gray-500">
            Min: 7 subjects · Max: 9 subjects · Kenya MoE KCSE Rules
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button
              onClick={() => onSave(student.id, selected)}
              disabled={saving || hasErrors}
              className={`px-5 py-2 rounded-xl text-sm font-black text-white flex items-center gap-2 transition-all ${
                hasErrors ? 'opacity-40 cursor-not-allowed bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
              }`}
            >
              {saving ? <FiRefreshCw size={13} className="animate-spin"/> : <FiSave size={13}/>}
              {saving ? 'Saving…' : 'Save Combination'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Register Modal ────────────────────────────────────────────────────────
function BulkModal({ forms, streams, students, existingMap, schoolSubjects, onSave, onClose, saving }: any) {
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [selected, setSelected] = useState<string[]>(['101', '102', '121']);
  const [overwrite, setOverwrite] = useState(false);

  const targetStudents = useMemo(() => {
    return students.filter((s: any) =>
      (!selForm || String(s.form_id) === selForm) &&
      (!selStream || String(s.stream_id) === selStream)
    );
  }, [students, selForm, selStream]);

  const alreadyRegistered = targetStudents.filter((s: any) => (existingMap[s.id] || []).length > 0).length;
  const conflicts = detectConflicts844(selected);
  const hasErrors = conflicts.some(c => c.severity === 'critical');

  const toggle = (code: string, compulsory: boolean) => {
    if (compulsory) return;
    setSelected(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold opacity-80 uppercase tracking-wider">Bulk Subject Registration</p>
              <h2 className="text-xl font-black mt-0.5">Assign to Entire Class</h2>
              <p className="text-xs opacity-70 mt-0.5">Assign one subject combination to many students at once</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <FiX size={16}/>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Target selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Form / Class</label>
              <select value={selForm} onChange={e => setSelForm(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="">All Forms</option>
                {forms.map((f: any) => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Stream</label>
              <select value={selStream} onChange={e => setSelStream(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                <option value="">All Streams</option>
                {streams.map((s: any) => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
              </select>
            </div>
          </div>

          {/* Target preview */}
          <div className={`p-4 rounded-2xl border-2 ${targetStudents.length > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <FiUsers size={15}/>
              {targetStudents.length} students will be registered
              {alreadyRegistered > 0 && <span className="text-amber-600 font-semibold">· {alreadyRegistered} already have subjects</span>}
            </div>
            {alreadyRegistered > 0 && (
              <label className="flex items-center gap-2 mt-2 cursor-pointer text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} className="rounded"/>
                Overwrite existing registrations
              </label>
            )}
          </div>

          {/* Conflict alerts */}
          {conflicts.map((c, i) => (
            <div key={i} className={`flex items-start gap-2 p-3 rounded-xl border text-sm font-semibold ${
              c.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
              c.severity === 'warning'  ? 'bg-amber-50 border-amber-200 text-amber-700' :
              'bg-green-50 border-green-200 text-green-700'
            }`}>
              {c.severity === 'critical' ? <FiXCircle size={14} className="mt-0.5 flex-shrink-0"/> :
               c.severity === 'warning'  ? <FiAlertTriangle size={14} className="mt-0.5 flex-shrink-0"/> :
               <FiCheckCircle size={14} className="mt-0.5 flex-shrink-0"/>}
              {c.message}
            </div>
          ))}

          {/* Quick presets */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quick Presets</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Sciences Stream', codes: ['101','102','121','231','232','233','311'] },
                { label: 'Arts Stream', codes: ['101','102','121','231','311','312','313','565'] },
                { label: 'Technical Stream', codes: ['101','102','121','231','311','443','451','565'] },
                { label: 'Form 1 Default', codes: ['101','102','121','231','232','311','312'] },
              ].map(p => (
                <button key={p.label} onClick={() => setSelected(p.codes)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-xs font-bold text-gray-600 transition-colors border border-gray-200">
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Groups */}
          {KCSE_GROUPS.map(group => (
            <div key={group.no} className="border rounded-2xl overflow-hidden" style={{ borderColor: group.border }}>
              <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: group.bg }}>
                <span>{group.icon}</span>
                <p className="text-xs font-black flex-1" style={{ color: group.color }}>{group.label}</p>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: group.color, color: '#fff' }}>
                  {group.subjects.filter(s => selected.includes(s.code)).length} selected
                </span>
              </div>
              <div className="p-3 flex flex-wrap gap-2 bg-white">
                {group.subjects.map(sub => {
                  const checked = selected.includes(sub.code);
                  return (
                    <button key={sub.code} onClick={() => toggle(sub.code, sub.compulsory)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        sub.compulsory ? 'cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500' :
                        checked ? 'text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                      }`} style={checked && !sub.compulsory ? { background: group.color, borderColor: group.color } : {}}>
                      {checked && <FiCheck size={10} strokeWidth={3}/>}
                      {sub.name}
                      {sub.compulsory && <span className="text-[8px] bg-gray-300 text-gray-600 px-1 rounded">CORE</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 p-4 flex items-center justify-between gap-3 flex-shrink-0 bg-gray-50">
          <p className="text-xs text-gray-500">{selected.length} subjects · {targetStudents.length} students</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button
              onClick={() => onSave(targetStudents.map((s: any) => s.id), selected, overwrite)}
              disabled={saving || hasErrors || targetStudents.length === 0}
              className={`px-5 py-2 rounded-xl text-sm font-black text-white flex items-center gap-2 transition-all ${
                (hasErrors || targetStudents.length === 0) ? 'opacity-40 cursor-not-allowed bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200'
              }`}
            >
              {saving ? <FiRefreshCw size={13} className="animate-spin"/> : <FiUpload size={13}/>}
              {saving ? 'Saving…' : `Register ${targetStudents.length} Students`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════
export default function SubjectRegistration844Page() {
  const [tab, setTab] = useState<'overview' | 'registry' | 'bulk' | 'reports'>('overview');
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [schoolSubjects, setSchoolSubjects] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]); // student_subjects_844 rows
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [selForm, setSelForm] = useState('');
  const [selStream, setSelStream] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete' | 'conflicts'>('all');
  const [searchQ, setSearchQ] = useState('');

  // Modals
  const [editStudent, setEditStudent] = useState<any>(null);
  const [showBulk, setShowBulk] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [formsRes, streamsRes, subjectsRes, regRes] = await Promise.all([
        supabase.from('school_forms').select('*').order('form_level'),
        supabase.from('school_streams').select('*').order('stream_name'),
        supabase.from('school_subjects').select('*').order('subject_name'),
        supabase.from('student_subjects_844').select('*'),
      ]);

      const allForms = formsRes.data || [];
      // 8-4-4 forms: form_level 1-4 (NOT CBC Senior which is 10+)
      const forms844 = allForms.filter(f => getEducationSystem(f.id, allForms) !== 'CBC_Senior_School');
      setForms(forms844);
      setStreams(streamsRes.data || []);
      setSchoolSubjects(subjectsRes.data || []);

      // Load students in 8-4-4 forms
      if (forms844.length > 0) {
        const { data: studs } = await supabase
          .from('school_students')
          .select('id, admission_number, admission_no, first_name, last_name, form_id, stream_id, gender, status')
          .in('form_id', forms844.map(f => f.id))
          .eq('status', 'Active')
          .order('first_name');
        setStudents(studs || []);
      }

      setRegistrations(regRes.data || []);
    } catch (e: any) {
      toast.error('Failed to load: ' + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Build registration map ─────────────────────────────────────────────────
  const existingMap = useMemo(() => {
    const m: Record<number, any[]> = {};
    registrations.forEach(r => {
      if (!m[r.student_id]) m[r.student_id] = [];
      m[r.student_id].push(r);
    });
    return m;
  }, [registrations]);

  // ── Enrich students ────────────────────────────────────────────────────────
  const enriched = useMemo(() => {
    return students.map(s => {
      const regs = existingMap[s.id] || [];
      const codes = regs.map((r: any) => {
        const sub = schoolSubjects.find((ss: any) => ss.id === r.subject_id);
        return sub?.subject_code || '';
      }).filter(Boolean);
      const conflicts = detectConflicts844(codes);
      const hasErrors = conflicts.some(c => c.severity === 'critical');
      const isComplete = codes.length >= 7 && !hasErrors;
      const form = forms.find(f => f.id === s.form_id);
      const stream = streams.find(st => st.id === s.stream_id);
      return { ...s, regs, codes, conflicts, hasErrors, isComplete, form, stream };
    });
  }, [students, existingMap, schoolSubjects, forms, streams]);

  // ── Filters ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQ.toLowerCase();
    return enriched.filter(s => {
      const name = `${s.first_name} ${s.last_name}`.toLowerCase();
      const adm = (s.admission_no || s.admission_number || '').toLowerCase();
      if (q && !name.includes(q) && !adm.includes(q)) return false;
      if (selForm && String(s.form_id) !== selForm) return false;
      if (selStream && String(s.stream_id) !== selStream) return false;
      if (statusFilter === 'complete' && !s.isComplete) return false;
      if (statusFilter === 'incomplete' && (s.isComplete || s.codes.length === 0)) return false;
      if (statusFilter === 'conflicts' && !s.hasErrors) return false;
      return true;
    });
  }, [enriched, searchQ, selForm, selStream, statusFilter]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = enriched.length;
    const registered = enriched.filter(s => s.codes.length > 0).length;
    const complete = enriched.filter(s => s.isComplete).length;
    const conflicts = enriched.filter(s => s.hasErrors && s.codes.length > 0).length;
    const unregistered = total - registered;
    const pct = total > 0 ? Math.round((complete / total) * 100) : 0;
    return { total, registered, complete, conflicts, unregistered, pct };
  }, [enriched]);

  // ── Save individual ────────────────────────────────────────────────────────
  const saveIndividual = async (studentId: number, codes: string[]) => {
    setSaving(true);
    try {
      // Delete existing
      await supabase.from('student_subjects_844').delete().eq('student_id', studentId);

      // Find subject IDs from codes - match against schoolSubjects or KCSE defaults
      const rows = codes.map(code => {
        const kcseSub = ALL_KCSE.find(s => s.code === code);
        const dbSub = schoolSubjects.find((s: any) =>
          s.subject_code === code ||
          (kcseSub && (s.subject_name?.toLowerCase().includes(kcseSub.name.toLowerCase().split(' ')[0])))
        );
        const subjectId = dbSub?.id || null;
        return subjectId ? {
          student_id: studentId,
          subject_id: subjectId,
          group_no: kcseSub?.group_no || 1,
          is_compulsory: kcseSub?.compulsory || false,
        } : null;
      }).filter(Boolean);

      if (rows.length > 0) {
        const { error } = await supabase.from('student_subjects_844').insert(rows);
        if (error) throw error;
      }

      toast.success(`✅ ${rows.length} subjects registered!`);
      setEditStudent(null);
      load();
    } catch (e: any) {
      toast.error('Save failed: ' + e.message);
    }
    setSaving(false);
  };

  // ── Save bulk ──────────────────────────────────────────────────────────────
  const saveBulk = async (studentIds: number[], codes: string[], overwrite: boolean) => {
    setSaving(true);
    let success = 0;
    try {
      for (const sid of studentIds) {
        const existing = existingMap[sid] || [];
        if (existing.length > 0 && !overwrite) continue;

        await supabase.from('student_subjects_844').delete().eq('student_id', sid);

        const rows = codes.map(code => {
          const kcseSub = ALL_KCSE.find(s => s.code === code);
          const dbSub = schoolSubjects.find((s: any) =>
            s.subject_code === code ||
            (kcseSub && s.subject_name?.toLowerCase().includes(kcseSub.name.toLowerCase().split(' ')[0]))
          );
          return dbSub ? {
            student_id: sid, subject_id: dbSub.id,
            group_no: kcseSub?.group_no || 1, is_compulsory: kcseSub?.compulsory || false,
          } : null;
        }).filter(Boolean);

        if (rows.length > 0) {
          await supabase.from('student_subjects_844').insert(rows);
          success++;
        }
      }
      toast.success(`✅ Registered ${success} students!`);
      setShowBulk(false);
      load();
    } catch (e: any) {
      toast.error('Bulk save failed: ' + e.message);
    }
    setSaving(false);
  };

  // ── Remove registration ────────────────────────────────────────────────────
  const removeRegistration = async (studentId: number) => {
    if (!confirm('Remove all subject registrations for this student?')) return;
    await supabase.from('student_subjects_844').delete().eq('student_id', studentId);
    toast.success('Registrations removed');
    load();
  };

  // ── Export CSV ─────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [['Admission No', 'Name', 'Form', 'Stream', 'Subjects', 'Count', 'Status']];
    enriched.forEach(s => {
      const subNames = s.codes.map((c: string) => ALL_KCSE.find(k => k.code === c)?.name || c).join(' | ');
      rows.push([
        s.admission_no || s.admission_number || '',
        `${s.first_name} ${s.last_name}`,
        s.form?.form_name || '',
        s.stream?.stream_name || '',
        subNames,
        String(s.codes.length),
        s.isComplete ? 'Complete' : s.codes.length > 0 ? 'Incomplete' : 'Not Registered',
      ]);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'KCSE_Subject_Registrations.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported!');
  };

  const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '—';
  const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '—';

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"/>
        <p className="text-sm font-semibold text-gray-500">Loading subject registrations…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8faff]">
      <Toaster position="top-right"/>

      {/* ── PAGE HEADER ── */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-700 to-blue-600 text-white px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <FiBook size={12}/> Students → Subject Registration
              </div>
              <h1 className="text-3xl font-black">📚 8-4-4 Subject Registration</h1>
              <p className="text-indigo-200 text-sm mt-1">Kenya MoE KCSE official subject combination management · Groups I–V</p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={() => setShowBulk(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold transition-colors">
                <FiUpload size={14}/> Bulk Register
              </button>
              <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-sm font-semibold transition-colors">
                <FiDownload size={14}/> Export CSV
              </button>
              <button onClick={load} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 text-sm font-black transition-colors">
                <FiRefreshCw size={14}/> Refresh
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6 bg-white/10 rounded-full h-2 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 bg-gradient-to-r from-green-400 to-emerald-400" style={{ width: `${stats.pct}%` }}/>
          </div>
          <div className="flex items-center justify-between mt-1.5 text-xs text-indigo-200">
            <span>{stats.complete} / {stats.total} students fully registered</span>
            <span className="font-black text-white">{stats.pct}% complete</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI label="Total Students" value={stats.total} sub="8-4-4 active students" icon="👨‍🎓" grad="linear-gradient(135deg,#1e40af,#3b82f6)"/>
          <KPI label="Fully Registered" value={stats.complete} sub={`${stats.pct}% completion`} icon="✅" grad="linear-gradient(135deg,#065f46,#10b981)"/>
          <KPI label="Not Registered" value={stats.unregistered} sub="Need subject assignment" icon="⚠️" grad="linear-gradient(135deg,#b45309,#f59e0b)"/>
          <KPI label="Conflicts" value={stats.conflicts} sub="KCSE rule violations" icon="🚨" grad="linear-gradient(135deg,#991b1b,#ef4444)"/>
        </div>

        {/* ── Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 flex overflow-x-auto">
            {[
              { id: 'overview', label: '📊 Overview', },
              { id: 'registry', label: '📋 Student Registry', },
              { id: 'bulk', label: '⚡ Quick Stats', },
              { id: 'reports', label: '📤 Reports & Export', },
            ].map(t => (
              <button key={t.id} onClick={() => setTab(t.id as any)} className={`px-6 py-4 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{t.label}</button>
            ))}
          </div>

          {/* ─── OVERVIEW TAB ─── */}
          {tab === 'overview' && (
            <div className="p-6 space-y-6">
              {/* Group distribution */}
              <div>
                <h3 className="text-sm font-black text-gray-700 mb-4">KCSE Group Subject Popularity</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {KCSE_GROUPS.map(group => {
                    const groupCodes = group.subjects.map(s => s.code);
                    const studentsWithGroup = enriched.filter(s => s.codes.some((c: string) => groupCodes.includes(c))).length;
                    const pct = stats.total > 0 ? Math.round((studentsWithGroup / stats.total) * 100) : 0;
                    return (
                      <div key={group.no} className="rounded-2xl border p-4" style={{ borderColor: group.border, background: group.bg }}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl">{group.icon}</span>
                          <div>
                            <p className="text-xs font-black" style={{ color: group.color }}>{group.label}</p>
                            <p className="text-[10px] text-gray-500">{group.rule}</p>
                          </div>
                        </div>
                        <div className="flex items-end justify-between mb-2">
                          <span className="text-2xl font-black" style={{ color: group.color }}>{pct}%</span>
                          <span className="text-xs text-gray-500">{studentsWithGroup} students</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/60 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: group.color }}/>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                          {group.subjects.map(sub => {
                            const cnt = enriched.filter(s => s.codes.includes(sub.code)).length;
                            return (
                              <span key={sub.code} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${group.badge}`}>
                                {sub.initials}: {cnt}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form-level breakdown */}
              <div>
                <h3 className="text-sm font-black text-gray-700 mb-4">Registration by Form</h3>
                <div className="rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        {['Form','Total','Registered','Complete','Conflicts','Completion'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {forms.map(form => {
                        const fStudents = enriched.filter(s => s.form_id === form.id);
                        const fComplete = fStudents.filter(s => s.isComplete).length;
                        const fConflicts = fStudents.filter(s => s.hasErrors && s.codes.length > 0).length;
                        const fRegistered = fStudents.filter(s => s.codes.length > 0).length;
                        const fPct = fStudents.length > 0 ? Math.round((fComplete / fStudents.length) * 100) : 0;
                        return (
                          <tr key={form.id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 font-bold text-gray-800">{form.form_name}</td>
                            <td className="px-4 py-3 text-gray-600">{fStudents.length}</td>
                            <td className="px-4 py-3 text-blue-600 font-semibold">{fRegistered}</td>
                            <td className="px-4 py-3 text-green-600 font-semibold">{fComplete}</td>
                            <td className="px-4 py-3">
                              {fConflicts > 0 ? <span className="text-red-600 font-bold">{fConflicts}</span> : <span className="text-gray-400">0</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div className="h-full rounded-full bg-indigo-500" style={{ width: `${fPct}%` }}/>
                                </div>
                                <span className="text-xs font-bold text-gray-600 w-8 text-right">{fPct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── REGISTRY TAB ─── */}
          {tab === 'registry' && (
            <div className="p-6 space-y-5">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Search by name or admission no…"
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"/>
                </div>
                <select value={selForm} onChange={e => setSelForm(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">All Forms</option>
                  {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                </select>
                <select value={selStream} onChange={e => setSelStream(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">All Streams</option>
                  {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                </select>
                <div className="flex rounded-xl border border-gray-200 overflow-hidden bg-white">
                  {(['all','complete','incomplete','conflicts'] as const).map(v => (
                    <button key={v} onClick={() => setStatusFilter(v)} className={`px-3 py-2 text-xs font-bold capitalize transition-colors ${statusFilter === v ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-xs text-gray-500">{filtered.length} student{filtered.length !== 1 ? 's' : ''} shown</p>

              {/* Student table */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Form / Stream</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Subjects ({'{'}count{'}'})</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-black text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-16 text-center text-gray-400 text-sm">No students match your filters</td></tr>
                    )}
                    {filtered.map(s => (
                      <tr key={s.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-black flex-shrink-0">
                              {s.first_name[0]}{s.last_name[0]}
                            </div>
                            <div>
                              <p className="font-bold text-gray-800">{s.first_name} {s.last_name}</p>
                              <p className="text-[11px] text-gray-400">{s.admission_no || s.admission_number}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-700">{s.form?.form_name || '—'}</p>
                          <p className="text-[11px] text-gray-400">{s.stream?.stream_name || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          {s.codes.length === 0 ? (
                            <span className="text-gray-400 text-xs italic">Not registered</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {s.codes.slice(0, 6).map((code: string) => {
                                const kcse = ALL_KCSE.find(k => k.code === code);
                                return kcse ? (
                                  <span key={code} className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${kcse.groupBadge}`}>
                                    {kcse.initials}
                                  </span>
                                ) : null;
                              })}
                              {s.codes.length > 6 && <span className="text-[10px] text-gray-400 font-semibold">+{s.codes.length - 6}</span>}
                              <span className="text-[10px] font-black text-gray-500 ml-1">({s.codes.length})</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {s.codes.length === 0 ? (
                            <span className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                              <FiInfo size={11}/> Unregistered
                            </span>
                          ) : s.hasErrors ? (
                            <div>
                              <span className="flex items-center gap-1 text-red-600 text-xs font-bold">
                                <FiXCircle size={11}/> Has conflicts
                              </span>
                              {s.conflicts.filter((c: any) => c.severity === 'critical').slice(0,1).map((c: any, i: number) => (
                                <p key={i} className="text-[10px] text-red-400 mt-0.5">{c.message}</p>
                              ))}
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                              <FiCheckCircle size={11}/> Complete
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setEditStudent(s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors">
                              <FiEdit2 size={11}/> {s.codes.length > 0 ? 'Edit' : 'Assign'}
                            </button>
                            {s.codes.length > 0 && (
                              <button onClick={() => removeRegistration(s.id)} className="flex items-center gap-1 p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-500 transition-colors">
                                <FiTrash2 size={12}/>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── QUICK STATS TAB ─── */}
          {tab === 'bulk' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Most popular subjects */}
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><FiBarChart2 size={14} className="text-indigo-500"/> Most Popular Subjects</h3>
                  <div className="space-y-2">
                    {ALL_KCSE
                      .map(sub => ({ ...sub, count: enriched.filter(s => s.codes.includes(sub.code)).length }))
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 10)
                      .map((sub, i) => {
                        const pct = stats.total > 0 ? Math.round((sub.count / stats.total) * 100) : 0;
                        return (
                          <div key={sub.code} className="flex items-center gap-3">
                            <span className="text-xs font-black text-gray-400 w-4 text-right">{i + 1}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${sub.groupBadge} flex-shrink-0`}>{sub.initials}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs font-semibold text-gray-700 truncate">{sub.name}</span>
                                <span className="text-xs font-black text-gray-500 ml-2">{sub.count} ({pct}%)</span>
                              </div>
                              <div className="h-1 rounded-full bg-gray-100 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: sub.groupColor }}/>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* KCSE compliance summary */}
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h3 className="text-sm font-black text-gray-700 mb-4 flex items-center gap-2"><FiShield size={14} className="text-green-500"/> KCSE Compliance Summary</h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Has English', check: (s: any) => s.codes.includes('101'), color: '#dc2626' },
                      { label: 'Has Kiswahili', check: (s: any) => s.codes.includes('102'), color: '#dc2626' },
                      { label: 'Has Mathematics', check: (s: any) => s.codes.includes('121'), color: '#2563eb' },
                      { label: 'Has at least 1 Science', check: (s: any) => ['231','232','233'].some(c => s.codes.includes(c)), color: '#2563eb' },
                      { label: 'Has at least 1 Humanity', check: (s: any) => ['311','312','313','314','315'].some(c => s.codes.includes(c)), color: '#16a34a' },
                      { label: '7-9 subjects (valid range)', check: (s: any) => s.codes.length >= 7 && s.codes.length <= 9, color: '#7c3aed' },
                      { label: 'Fully compliant (all rules)', check: (s: any) => s.isComplete, color: '#059669' },
                    ].map(item => {
                      const passing = enriched.filter(s => s.codes.length > 0).filter(item.check).length;
                      const total = enriched.filter(s => s.codes.length > 0).length;
                      const pct = total > 0 ? Math.round((passing / total) * 100) : 0;
                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                            <span className="text-xs font-black" style={{ color: item.color }}>{passing}/{total} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: item.color }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Students needing attention */}
              {enriched.filter(s => s.hasErrors && s.codes.length > 0).length > 0 && (
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                  <h3 className="text-sm font-black text-red-700 mb-3 flex items-center gap-2">
                    <FiAlertTriangle size={14}/> Students with KCSE Rule Violations
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {enriched.filter(s => s.hasErrors && s.codes.length > 0).map(s => (
                      <div key={s.id} className="bg-white rounded-xl border border-red-100 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-800">{s.first_name} {s.last_name}</p>
                          <button onClick={() => setEditStudent(s)} className="text-xs text-indigo-600 font-bold hover:underline">Fix</button>
                        </div>
                        {s.conflicts.filter((c: any) => c.severity === 'critical').map((c: any, i: number) => (
                          <p key={i} className="text-[10px] text-red-500 font-semibold">{c.message}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── REPORTS TAB ─── */}
          {tab === 'reports' && (
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'Student Subject Register (CSV)', desc: 'All students with their KCSE subject combinations', icon: '📊', color: 'bg-indigo-600', action: exportCSV },
                  { label: 'Unregistered Students List', desc: 'Students who have not been assigned subjects', icon: '⚠️', color: 'bg-amber-500',
                    action: () => {
                      const rows = [['Admission No','Name','Form','Stream']];
                      enriched.filter(s => s.codes.length === 0).forEach(s => rows.push([s.admission_no||s.admission_number||'',`${s.first_name} ${s.last_name}`,s.form?.form_name||'',s.stream?.stream_name||'']));
                      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'Unregistered_Students.csv'; a.click(); URL.revokeObjectURL(url);
                      toast.success('Exported unregistered students!');
                    }
                  },
                  { label: 'KCSE Conflicts Report', desc: 'Students violating Kenya MoE subject combination rules', icon: '🚨', color: 'bg-red-600',
                    action: () => {
                      const rows = [['Admission No','Name','Form','Stream','Subjects','Conflict']];
                      enriched.filter(s => s.hasErrors).forEach(s => s.conflicts.filter((c: any) => c.severity === 'critical').forEach((c: any) => rows.push([s.admission_no||s.admission_number||'',`${s.first_name} ${s.last_name}`,s.form?.form_name||'',s.stream?.stream_name||'',s.codes.join(';'),c.message])));
                      const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'KCSE_Conflicts_Report.csv'; a.click(); URL.revokeObjectURL(url);
                      toast.success('Conflicts report exported!');
                    }
                  },
                ].map(item => (
                  <div key={item.label} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition-shadow">
                    <div className="text-3xl mb-3">{item.icon}</div>
                    <h3 className="text-sm font-black text-gray-800 mb-1">{item.label}</h3>
                    <p className="text-xs text-gray-500 mb-4">{item.desc}</p>
                    <button onClick={item.action} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white ${item.color} hover:opacity-90 transition-opacity`}>
                      <FiDownload size={12}/> Download CSV
                    </button>
                  </div>
                ))}
              </div>

              {/* Full student report table */}
              <div className="rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                  <h3 className="text-sm font-black text-gray-700">Full Registration Report</h3>
                  <span className="text-xs text-gray-500">{enriched.length} students</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['Admission','Name','Form','Stream','Subjects','Count','Status','Conflicts'].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left font-black text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {enriched.slice(0, 100).map(s => (
                        <tr key={s.id} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2 font-mono text-gray-500">{s.admission_no||s.admission_number||'—'}</td>
                          <td className="px-3 py-2 font-bold text-gray-800 whitespace-nowrap">{s.first_name} {s.last_name}</td>
                          <td className="px-3 py-2 text-gray-600">{s.form?.form_name||'—'}</td>
                          <td className="px-3 py-2 text-gray-600">{s.stream?.stream_name||'—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-0.5">
                              {s.codes.map((c: string) => {
                                const k = ALL_KCSE.find(x => x.code === c);
                                return k ? <span key={c} className={`text-[9px] font-bold px-1 rounded border ${k.groupBadge}`}>{k.initials}</span> : null;
                              })}
                            </div>
                          </td>
                          <td className="px-3 py-2 font-black text-center text-gray-700">{s.codes.length}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {s.codes.length === 0 ? <span className="text-gray-400">None</span> :
                             s.isComplete ? <span className="text-green-600 font-bold">✓ Complete</span> :
                             <span className="text-red-500 font-bold">⚠ Conflicts</span>}
                          </td>
                          <td className="px-3 py-2">
                            {s.conflicts.filter((c: any) => c.severity === 'critical').map((c: any, i: number) => (
                              <p key={i} className="text-red-500 text-[9px] whitespace-nowrap">{c.message}</p>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {editStudent && (
        <SubjectModal
          student={editStudent}
          existing={existingMap[editStudent.id] || []}
          schoolSubjects={schoolSubjects}
          saving={saving}
          onSave={saveIndividual}
          onClose={() => setEditStudent(null)}
        />
      )}

      {showBulk && (
        <BulkModal
          forms={forms}
          streams={streams}
          students={students}
          existingMap={existingMap}
          schoolSubjects={schoolSubjects}
          saving={saving}
          onSave={saveBulk}
          onClose={() => setShowBulk(false)}
        />
      )}
    </div>
  );
}

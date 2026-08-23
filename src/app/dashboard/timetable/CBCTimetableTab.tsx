'use client';

import { useState, useMemo } from 'react';
import { useTimetable } from './TimetableProvider';
import { DAYS } from './timetable-colors';
import {
  FiGrid, FiBook, FiAlertTriangle, FiCheckCircle, FiInfo,
  FiBarChart2, FiPrinter, FiFilter, FiList, FiLayers,
} from 'react-icons/fi';

// ─── CBC Learning Area Framework (KICD 2023) ──────────────────────────────────
export type CBCCategory = 'core' | 'applied' | 'elective' | 'activity' | 'other';

interface LearningAreaDef {
  names: string[];          // subject_name matches (partial)
  category: CBCCategory;
  kicdCode: string;
  minHrsPerWeek: number;    // KICD minimum
  color: { bg: string; text: string; border: string; dot: string };
  emoji: string;
}

const LEARNING_AREAS: LearningAreaDef[] = [
  { names: ['Mathematics','Maths'],              category:'core',     kicdCode:'MAT', minHrsPerWeek:5, color:{bg:'#EFF6FF',text:'#1D4ED8',border:'#93C5FD',dot:'#2563EB'}, emoji:'📐' },
  { names: ['English'],                          category:'core',     kicdCode:'ENG', minHrsPerWeek:5, color:{bg:'#FDF4FF',text:'#7C3AED',border:'#C4B5FD',dot:'#7C3AED'}, emoji:'📚' },
  { names: ['Kiswahili'],                        category:'core',     kicdCode:'KIS', minHrsPerWeek:4, color:{bg:'#FFF7ED',text:'#C2410C',border:'#FDBA74',dot:'#EA580C'}, emoji:'🗣️' },
  { names: ['Science','Biology','Chemistry','Physics'], category:'core', kicdCode:'SCI', minHrsPerWeek:4, color:{bg:'#F0FDF4',text:'#15803D',border:'#86EFAC',dot:'#16A34A'}, emoji:'🔬' },
  { names: ['Social Studies','History','Geography'], category:'core',  kicdCode:'SST', minHrsPerWeek:3, color:{bg:'#FEF9C3',text:'#A16207',border:'#FDE047',dot:'#CA8A04'}, emoji:'🌍' },
  { names: ['CRE','IRE','HRE','Religious'],       category:'core',     kicdCode:'REL', minHrsPerWeek:2, color:{bg:'#FFF1F2',text:'#BE123C',border:'#FCA5A5',dot:'#E11D48'}, emoji:'✝️' },
  { names: ['Agriculture'],                       category:'applied',  kicdCode:'AGR', minHrsPerWeek:2, color:{bg:'#ECFDF5',text:'#047857',border:'#6EE7B7',dot:'#059669'}, emoji:'🌱' },
  { names: ['Home Science'],                      category:'applied',  kicdCode:'HSC', minHrsPerWeek:2, color:{bg:'#FFF7ED',text:'#92400E',border:'#FCD34D',dot:'#D97706'}, emoji:'🍳' },
  { names: ['Business'],                          category:'applied',  kicdCode:'BST', minHrsPerWeek:2, color:{bg:'#F0F9FF',text:'#0369A1',border:'#7DD3FC',dot:'#0284C7'}, emoji:'💼' },
  { names: ['Computer','ICT','Digital'],          category:'applied',  kicdCode:'ICT', minHrsPerWeek:2, color:{bg:'#EFF6FF',text:'#1E40AF',border:'#93C5FD',dot:'#3B82F6'}, emoji:'💻' },
  { names: ['Creative Arts','Art','Music','Drama','Performing'], category:'applied', kicdCode:'CRE', minHrsPerWeek:2, color:{bg:'#FDF4FF',text:'#9333EA',border:'#E879F9',dot:'#A855F7'}, emoji:'🎨' },
  { names: ['Physical Education','PE','Sports'],  category:'activity', kicdCode:'PHE', minHrsPerWeek:2, color:{bg:'#FFF7ED',text:'#B45309',border:'#FDE68A',dot:'#F59E0B'}, emoji:'⚽' },
  { names: ['Life Skills','Guidance','Counselling'], category:'activity', kicdCode:'LSK', minHrsPerWeek:1, color:{bg:'#F0FDF4',text:'#166534',border:'#86EFAC',dot:'#15803D'}, emoji:'🧠' },
];

const CATEGORY_META: Record<CBCCategory,{label:string;color:string;bg:string}> = {
  core:     { label:'Core Learning Areas',    color:'#1D4ED8', bg:'#EFF6FF' },
  applied:  { label:'Applied Subjects',        color:'#059669', bg:'#ECFDF5' },
  elective: { label:'Electives',               color:'#7C3AED', bg:'#F5F3FF' },
  activity: { label:'Activity Periods',        color:'#D97706', bg:'#FFF7ED' },
  other:    { label:'Other',                   color:'#6B7280', bg:'#F9FAFB' },
};

// CBC Grades — Grade 7-9 = JSS, Grade 10-12 = Senior
const CBC_GRADES = ['Grade 7','Grade 8','Grade 9','Form 1','Form 2','Form 3','Form 4','Grade 10','Grade 11','Grade 12','JSS 1','JSS 2','JSS 3'];

function classifySubject(subjectName: string): LearningAreaDef {
  const sn = (subjectName || '').toLowerCase();
  for (const la of LEARNING_AREAS) {
    if (la.names.some(n => sn.includes(n.toLowerCase()))) return la;
  }
  return { names: [subjectName], category: 'other', kicdCode: 'OTH', minHrsPerWeek: 1, color: { bg: '#F9FAFB', text: '#374151', border: '#D1D5DB', dot: '#6B7280' }, emoji: '📖' };
}

// ─── Components ──────────────────────────────────────────────────────────────

function CBCBadge({ cat }: { cat: CBCCategory }) {
  const m = CATEGORY_META[cat];
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black border" style={{ background: m.bg, color: m.color, borderColor: m.color + '44' }}>{m.label}</span>;
}

function ComplianceBar({ subject, hoursPerWeek, minRequired, color }: { subject: string; hoursPerWeek: number; minRequired: number; color: any }) {
  const pct = Math.min((hoursPerWeek / minRequired) * 100, 100);
  const ok = hoursPerWeek >= minRequired;
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] text-gray-600 w-28 flex-shrink-0 truncate font-semibold">{subject}</p>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: ok ? color.dot : '#f59e0b' }} />
      </div>
      <div className="flex-shrink-0 flex items-center gap-1">
        <span className="text-[10px] font-black" style={{ color: ok ? color.dot : '#f59e0b' }}>{hoursPerWeek}h</span>
        <span className="text-[9px] text-gray-400">/ {minRequired}h</span>
        {ok ? <FiCheckCircle size={10} className="text-green-500" /> : <FiAlertTriangle size={10} className="text-amber-500" />}
      </div>
    </div>
  );
}

// ─── Main CBC Tab ─────────────────────────────────────────────────────────────
export default function CBCTimetableTab() {
  const { forms, streams, subjects, teachers, termEntries, allPeriodsSorted, lessonPeriods, getSubjectName, getTeacherShort, getFormName, getStreamName, bTerm, bYear, printTimetable } = useTimetable();
  const [viewMode, setViewMode] = useState<'grid'|'compliance'|'summary'>('grid');
  const [selForm, setSelForm] = useState<number | null>(null);
  const [selStream, setSelStream] = useState<number | null>(null);
  const [showCBCOnly, setShowCBCOnly] = useState(false);

  // Detect CBC forms (names contain grade keywords)
  const cbcForms = forms.filter(f => CBC_GRADES.some(g => (f.form_name || '').toLowerCase().includes(g.toLowerCase())));
  const isCBCForm = (formId: number) => cbcForms.some(f => f.id === formId);

  // Enrich subjects with CBC classification
  const enrichedSubjects = useMemo(() => subjects.map(s => ({ ...s, cbc: classifySubject(s.subject_name) })), [subjects]);
  const getSubjectCBC = (subjectId: number) => enrichedSubjects.find(s => s.id === subjectId)?.cbc || classifySubject('');

  // Filter entries
  const activeForm = selForm || forms[0]?.id;
  const activeStream = selStream || streams[0]?.id;
  const gridEntries = termEntries.filter(e => e.form_id === activeForm && e.stream_id === activeStream);

  // Calculate hours per subject for selected class
  const subjectHours = useMemo(() => {
    const map: Record<number, number> = {};
    gridEntries.forEach(e => { if (e.subject_id) map[e.subject_id] = (map[e.subject_id] || 0) + 1; });
    return map;
  }, [gridEntries]);

  // Learning area compliance for selected class
  const complianceData = useMemo(() => {
    return LEARNING_AREAS.map(la => {
      const matchingSubjects = enrichedSubjects.filter(s => s.cbc.kicdCode === la.kicdCode);
      const totalHours = matchingSubjects.reduce((sum, s) => sum + (subjectHours[s.id] || 0), 0);
      return { ...la, totalHours, subjects: matchingSubjects };
    }).filter(la => la.subjects.length > 0 || la.category === 'core');
  }, [enrichedSubjects, subjectHours]);

  const compliantCount = complianceData.filter(c => c.totalHours >= c.minHrsPerWeek).length;
  const totalHoursScheduled = Object.values(subjectHours).reduce((a, b) => a + b, 0);

  // All classes summary
  const classSummary = useMemo(() => {
    return forms.flatMap(form => streams.map(stream => {
      const entries = termEntries.filter(e => e.form_id === form.id && e.stream_id === stream.id);
      if (entries.length === 0) return null;
      const bySubject: Record<number, number> = {};
      entries.forEach(e => { if (e.subject_id) bySubject[e.subject_id] = (bySubject[e.subject_id] || 0) + 1; });
      const compliance = LEARNING_AREAS.map(la => {
        const matchSubs = enrichedSubjects.filter(s => s.cbc.kicdCode === la.kicdCode);
        const hrs = matchSubs.reduce((sum, s) => sum + (bySubject[s.id] || 0), 0);
        return { ...la, totalHours: hrs, ok: hrs >= la.minHrsPerWeek };
      });
      const compliant = compliance.filter(c => c.ok && c.subjects?.length > 0).length;
      const total = compliance.filter(c => c.subjects?.length > 0).length;
      return { form, stream, entries: entries.length, compliance, compliant, total, pct: total ? Math.round((compliant / total) * 100) : 0 };
    })).filter(Boolean);
  }, [forms, streams, termEntries, enrichedSubjects]);

  const printCBC = () => {
    const w = window.open('', '_blank'); if (!w) return;
    const rows = allPeriodsSorted.map(period => {
      const cells = DAYS.map(day => {
        const e = gridEntries.find(en => en.day_of_week === day && en.period_id === period.id);
        if (!e || !e.subject_id) return '<td style="border:1px solid #e5e7eb;min-width:100px;padding:4px"><span style="color:#d1d5db;font-size:10px">—</span></td>';
        const cbc = getSubjectCBC(e.subject_id);
        return `<td style="border:1px solid #e5e7eb;min-width:100px;padding:3px"><div style="background:${cbc.color.bg};border:2px solid ${cbc.color.border};border-radius:6px;padding:6px;text-align:center"><div style="font-weight:800;color:${cbc.color.text};font-size:11px">${getSubjectName(e.subject_id)}</div><div style="font-size:9px;color:#6b7280;margin-top:2px">${e.teacher_id ? getTeacherShort(e.teacher_id) : ''}</div><div style="font-size:8px;color:${cbc.color.dot};font-weight:700;margin-top:1px">${cbc.emoji} ${cbc.kicdCode}</div></div></td>`;
      }).join('');
      if (period.period_type !== 'lesson') return `<tr><td colspan="${DAYS.length + 2}" style="background:#fef9c3;padding:8px;font-size:10px;font-weight:700;text-align:center;border:1px solid #fde047;color:#854d0e">☕ ${period.period_name}</td></tr>`;
      return `<tr><td style="border:1px solid #e5e7eb;padding:8px;font-size:10px;font-weight:700;white-space:nowrap;background:#f8fafc">${period.period_name}</td><td style="border:1px solid #e5e7eb;padding:8px;font-size:9px;color:#6b7280;white-space:nowrap;background:#f8fafc">${period.start_time?.substring(0,5)} - ${period.end_time?.substring(0,5)}</td>${cells}</tr>`;
    }).join('');
    w.document.write(`<!DOCTYPE html><html><head><title>CBC Timetable</title><style>@page{size:A4 landscape;margin:10mm}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;padding:20px}.hdr{text-align:center;margin-bottom:16px;padding-bottom:12px;border-bottom:3px solid #0891b2}.hdr h1{font-size:20px;color:#0891b2;font-weight:900;text-transform:uppercase}.hdr p{font-size:11px;color:#6b7280;margin-top:4px}table{width:100%;border-collapse:collapse}.legend{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.leg-item{display:flex;align-items:center;gap:4px;font-size:9px;font-weight:700}</style></head><body><div class="hdr"><h1>CBC TIMETABLE — ${getFormName(activeForm)} ${getStreamName(activeStream)}</h1><p>${bTerm} ${bYear} · Competency-Based Curriculum · KICD Compliant</p></div><table><thead><tr><th style="background:#0f172a;color:#fff;padding:10px;font-size:10px;border:1px solid #1e293b">Period</th><th style="background:#0f172a;color:#fff;padding:10px;font-size:10px;border:1px solid #1e293b">Time</th>${DAYS.map(d => `<th style="background:#0891b2;color:#fff;padding:10px;font-size:10px;text-align:center;border:1px solid #0e7490;text-transform:uppercase">${d}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="legend">${LEARNING_AREAS.map(la => `<span class="leg-item"><span style="width:10px;height:10px;border-radius:2px;background:${la.color.dot};display:inline-block"></span>${la.emoji} ${la.kicdCode}</span>`).join('')}</div></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 500);
  };

  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)' }}>
            <FiGrid size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">CBC Timetable</h2>
            <p className="text-xs text-gray-500">KICD Learning Areas · Compliance · Pathway-Aware · {bTerm} {bYear}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={printCBC} className="px-3 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5 shadow-sm hover:bg-gray-50 transition-all"><FiPrinter size={13} /> Print CBC</button>
          {(['grid','compliance','summary'] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)} className={`px-3 py-2 text-xs font-bold rounded-xl transition-all capitalize ${viewMode === m ? 'bg-cyan-600 text-white shadow-md' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}>
              {m === 'grid' ? '📅 Grid' : m === 'compliance' ? '✅ Compliance' : '📊 Summary'}
            </button>
          ))}
        </div>
      </div>

      {/* CBC LEGEND */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-3">KICD Learning Area Categories</p>
        <div className="flex flex-wrap gap-2">
          {LEARNING_AREAS.map(la => (
            <div key={la.kicdCode} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border" style={{ background: la.color.bg, borderColor: la.color.border }}>
              <span className="text-sm">{la.emoji}</span>
              <div>
                <p className="text-[10px] font-black" style={{ color: la.color.text }}>{la.kicdCode}</p>
                <p className="text-[8px] text-gray-400">{la.minHrsPerWeek}h/wk min</p>
              </div>
              <CBCBadge cat={la.category} />
            </div>
          ))}
        </div>
      </div>

      {/* FORM / STREAM SELECTOR */}
      {viewMode !== 'summary' && (
        <div className="flex flex-wrap gap-3 items-center">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Form / Grade</label>
            <select value={activeForm || ''} onChange={e => setSelForm(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white shadow-sm">
              {forms.map(f => (
                <option key={f.id} value={f.id}>{f.form_name} {cbcForms.some(c => c.id === f.id) ? '🟢 CBC' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Stream / Class</label>
            <select value={activeStream || ''} onChange={e => setSelStream(Number(e.target.value))}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 bg-white shadow-sm">
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div className="mt-5">
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-50 border border-cyan-200 text-xs font-bold text-cyan-800">
              <FiGrid size={13} /> {totalHoursScheduled} lessons/wk · {getFormName(activeForm)} {getStreamName(activeStream)}
            </span>
          </div>
        </div>
      )}

      {/* ── GRID VIEW ── */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <FiGrid size={14} className="text-cyan-500" /> {getFormName(activeForm)} {getStreamName(activeStream)} · CBC Timetable
            </h3>
            <span className="text-xs text-gray-400">{gridEntries.length} lessons scheduled</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'fixed', minWidth: 700 }}>
              <thead>
                <tr className="bg-slate-800">
                  <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider w-28">Period</th>
                  <th className="px-3 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-wider w-24">Time</th>
                  {DAYS.map(day => (
                    <th key={day} className="px-2 py-3 text-center text-[10px] font-black text-white uppercase tracking-wider">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allPeriodsSorted.map((period, pi) => {
                  if (period.period_type !== 'lesson') {
                    return (
                      <tr key={period.id}>
                        <td colSpan={DAYS.length + 2} className="px-4 py-2.5 text-center" style={{ background: 'linear-gradient(90deg,#fef9c3,#fffbeb)', borderTop: '1px solid #fde68a', borderBottom: '1px solid #fde68a' }}>
                          <span className="text-[11px] font-black text-amber-700">☕ {period.period_name} ({period.start_time?.substring(0,5)} – {period.end_time?.substring(0,5)})</span>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={period.id} className={pi % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                      <td className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-800">{period.period_name}</p>
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100">
                        <p className="text-[10px] text-gray-400">{period.start_time?.substring(0,5)}<br />{period.end_time?.substring(0,5)}</p>
                      </td>
                      {DAYS.map(day => {
                        const entry = gridEntries.find(e => e.day_of_week === day && e.period_id === period.id);
                        const cbc = entry?.subject_id ? getSubjectCBC(entry.subject_id) : null;
                        return (
                          <td key={day} className="px-1 py-1.5 border-b border-gray-100">
                            {entry && cbc ? (
                              <div className="rounded-xl border-2 p-2 text-center transition-all hover:shadow-md" style={{ background: cbc.color.bg, borderColor: cbc.color.border }}>
                                <div className="text-[9px] mb-0.5">{cbc.emoji}</div>
                                <p className="text-[10px] font-black leading-tight" style={{ color: cbc.color.text }}>{getSubjectName(entry.subject_id)}</p>
                                {entry.teacher_id && <p className="text-[9px] text-gray-500 mt-0.5 truncate">{getTeacherShort(entry.teacher_id)}</p>}
                                <p className="text-[8px] font-extrabold mt-0.5 uppercase tracking-wide" style={{ color: cbc.color.dot }}>{cbc.kicdCode}</p>
                                {entry.is_double && <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1 rounded-full">×2</span>}
                              </div>
                            ) : (
                              <div className="rounded-xl border-2 border-dashed border-gray-100 p-2 text-center">
                                <p className="text-[10px] text-gray-200">—</p>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* CBC Category Row Summary */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/60">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Learning Area Load This Week</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(
                gridEntries.reduce((acc, e) => {
                  if (!e.subject_id) return acc;
                  const cbc = getSubjectCBC(e.subject_id);
                  acc[cbc.kicdCode] = (acc[cbc.kicdCode] || { ...cbc, count: 0 });
                  acc[cbc.kicdCode].count++;
                  return acc;
                }, {} as Record<string, any>)
              ).sort((a, b) => b[1].count - a[1].count).map(([code, info]) => (
                <div key={code} className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border" style={{ background: info.color.bg, borderColor: info.color.border }}>
                  <span className="text-xs">{info.emoji}</span>
                  <span className="text-[10px] font-black" style={{ color: info.color.text }}>{code}</span>
                  <span className="text-[10px] font-bold text-gray-500">{info.count}h</span>
                  {info.count >= info.minHrsPerWeek ? <FiCheckCircle size={10} className="text-green-500" /> : <FiAlertTriangle size={10} className="text-amber-500" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── COMPLIANCE VIEW ── */}
      {viewMode === 'compliance' && (
        <div className="space-y-4">
          {/* Compliance Score */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Compliant Areas', value: `${compliantCount}/${complianceData.length}`, icon: '✅', color: '#10b981' },
              { label: 'Total Lessons/Week', value: totalHoursScheduled, icon: '📅', color: '#6366f1' },
              { label: 'CBC Status', value: compliantCount === complianceData.length ? 'Compliant' : 'Gaps Found', icon: compliantCount === complianceData.length ? '🟢' : '🟡', color: compliantCount === complianceData.length ? '#10b981' : '#f59e0b' },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{icon}</span>
                  <p className="text-2xl font-black" style={{ color }}>{value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Per Learning Area Compliance */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2"><FiBarChart2 size={14} className="text-cyan-500" /> KICD Learning Area Hours Compliance — {getFormName(activeForm)} {getStreamName(activeStream)}</h3>
            {compliantCount < complianceData.length && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200 mb-4">
                <FiAlertTriangle size={16} className="text-amber-600" />
                <p className="text-xs font-bold text-amber-800">{complianceData.length - compliantCount} learning area{complianceData.length - compliantCount > 1 ? 's' : ''} below KICD minimum hours requirement</p>
              </div>
            )}
            <div className="space-y-4">
              {Object.entries(CATEGORY_META).map(([cat, meta]) => {
                const areas = complianceData.filter(la => la.category === cat);
                if (areas.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-[10px] font-extrabold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: meta.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: meta.color }} />
                      {meta.label}
                    </p>
                    <div className="space-y-2 pl-4">
                      {areas.map(la => (
                        <ComplianceBar key={la.kicdCode} subject={`${la.emoji} ${la.kicdCode}`} hoursPerWeek={la.totalHours} minRequired={la.minHrsPerWeek} color={la.color} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Subject → Learning Area mapping */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-800">Subject → CBC Learning Area Mapping</h3></div>
            <div className="divide-y divide-gray-100">
              {enrichedSubjects.filter(s => subjectHours[s.id] > 0).sort((a, b) => (subjectHours[b.id] || 0) - (subjectHours[a.id] || 0)).map(sub => (
                <div key={sub.id} className="px-5 py-3 flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{ background: sub.cbc.color.bg }}>{sub.cbc.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">{sub.subject_name}</p>
                    <CBCBadge cat={sub.cbc.category} />
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black" style={{ color: sub.cbc.color.text }}>{subjectHours[sub.id] || 0}h</p>
                    <p className="text-[10px] text-gray-400">per week</p>
                  </div>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg border flex-shrink-0" style={{ background: sub.cbc.color.bg, color: sub.cbc.color.text, borderColor: sub.cbc.color.border }}>{sub.cbc.kicdCode}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUMMARY VIEW ── */}
      {viewMode === 'summary' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiLayers size={14} className="text-cyan-500" /> All Classes CBC Compliance Summary</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['Class', 'Lessons/wk', 'CBC Compliance', 'Core', 'Applied', 'Activity', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(classSummary as any[]).map((cls: any) => {
                    if (!cls) return null;
                    const coreOk = cls.compliance.filter((c: any) => c.category === 'core').every((c: any) => c.ok || c.subjects?.length === 0);
                    const appliedOk = cls.compliance.filter((c: any) => c.category === 'applied').some((c: any) => c.ok);
                    const actOk = cls.compliance.filter((c: any) => c.category === 'activity').some((c: any) => c.ok);
                    const isCBC = isCBCForm(cls.form.id);
                    return (
                      <tr key={`${cls.form.id}-${cls.stream.id}`} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black text-white" style={{ background: isCBC ? 'linear-gradient(135deg,#0891b2,#0e7490)' : 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                              {cls.form.form_name?.[0]}{cls.stream.stream_name?.[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800">{cls.form.form_name} {cls.stream.stream_name}</p>
                              {isCBC && <p className="text-[9px] text-cyan-600 font-bold">CBC Grade</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-sm font-black text-gray-800">{cls.entries}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${cls.pct}%`, background: cls.pct >= 80 ? '#10b981' : cls.pct >= 60 ? '#f59e0b' : '#ef4444' }} />
                            </div>
                            <span className="text-xs font-black" style={{ color: cls.pct >= 80 ? '#10b981' : cls.pct >= 60 ? '#f59e0b' : '#ef4444' }}>{cls.pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{coreOk ? <FiCheckCircle size={14} className="text-green-500" /> : <FiAlertTriangle size={14} className="text-amber-500" />}</td>
                        <td className="px-4 py-3">{appliedOk ? <FiCheckCircle size={14} className="text-green-500" /> : <FiAlertTriangle size={14} className="text-amber-500" />}</td>
                        <td className="px-4 py-3">{actOk ? <FiCheckCircle size={14} className="text-green-500" /> : <FiAlertTriangle size={14} className="text-amber-500" />}</td>
                        <td className="px-4 py-3">
                          {cls.pct >= 80
                            ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">✓ Compliant</span>
                            : cls.pct >= 60
                              ? <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">⚠ Partial</span>
                              : <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">✗ Gaps</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* School-wide CBC KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total Classes', value: (classSummary as any[]).filter(Boolean).length, color: '#6366f1', emoji: '🏫' },
              { label: 'Fully Compliant', value: (classSummary as any[]).filter((c: any) => c?.pct >= 80).length, color: '#10b981', emoji: '✅' },
              { label: 'Partial Compliance', value: (classSummary as any[]).filter((c: any) => c?.pct >= 60 && c?.pct < 80).length, color: '#f59e0b', emoji: '⚠️' },
              { label: 'Needs Review', value: (classSummary as any[]).filter((c: any) => c?.pct < 60).length, color: '#ef4444', emoji: '❌' },
            ].map(({ label, value, color, emoji }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 text-center">
                <p className="text-3xl mb-1">{emoji}</p>
                <p className="text-2xl font-black" style={{ color }}>{value}</p>
                <p className="text-[10px] text-gray-500 font-semibold mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


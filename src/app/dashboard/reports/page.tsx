'use client';
import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiDownload, FiPrinter, FiSearch, FiFilter, FiFileText, FiBarChart2,
  FiGrid, FiTrendingUp, FiAward, FiDollarSign, FiCalendar, FiBookOpen,
  FiCheckSquare, FiSquare, FiDatabase, FiX, FiChevronLeft, FiChevronRight,
  FiArrowUp, FiArrowDown, FiRefreshCw, FiEye, FiStar, FiUsers, FiPercent,
  FiChevronsLeft, FiChevronsRight, FiMinus, FiMaximize2, FiShare2, FiCopy,
} from 'react-icons/fi';

// ═══════════════════════════════════════════════════════════════════
//  KCSE GRADING ENGINE — Kenya National Examinations Council (KNEC)
// ═══════════════════════════════════════════════════════════════════
const KCSE_GRADES = [
  { grade: 'A',  min: 80, max: 100, pts: 12, color: '#059669', bg: '#d1fae5', label: 'Excellent'   },
  { grade: 'A-', min: 75, max: 79,  pts: 11, color: '#10b981', bg: '#d1fae5', label: 'Excellent'   },
  { grade: 'B+', min: 70, max: 74,  pts: 10, color: '#0891b2', bg: '#cffafe', label: 'Very Good'   },
  { grade: 'B',  min: 65, max: 69,  pts: 9,  color: '#2563eb', bg: '#dbeafe', label: 'Good'        },
  { grade: 'B-', min: 60, max: 64,  pts: 8,  color: '#4f46e5', bg: '#e0e7ff', label: 'Good'        },
  { grade: 'C+', min: 55, max: 59,  pts: 7,  color: '#7c3aed', bg: '#ede9fe', label: 'Average'     },
  { grade: 'C',  min: 50, max: 54,  pts: 6,  color: '#ca8a04', bg: '#fef9c3', label: 'Average'     },
  { grade: 'C-', min: 45, max: 49,  pts: 5,  color: '#d97706', bg: '#fef3c7', label: 'Fair'        },
  { grade: 'D+', min: 40, max: 44,  pts: 4,  color: '#ea580c', bg: '#ffedd5', label: 'Below Avg'   },
  { grade: 'D',  min: 35, max: 39,  pts: 3,  color: '#dc2626', bg: '#fee2e2', label: 'Weak'        },
  { grade: 'D-', min: 30, max: 34,  pts: 2,  color: '#b91c1c', bg: '#fecaca', label: 'Weak'        },
  { grade: 'E',  min: 0,  max: 29,  pts: 1,  color: '#7f1d1d', bg: '#fca5a5', label: 'Very Weak'   },
];

const getGrade = (score: number) =>
  KCSE_GRADES.find(g => score >= g.min && score <= g.max) || KCSE_GRADES[KCSE_GRADES.length - 1];

const gradeCSS = (grade: string) => {
  const g = KCSE_GRADES.find(x => x.grade === grade);
  return g ? { color: g.color, backgroundColor: g.bg } : { color: '#6b7280', backgroundColor: '#f9fafb' };
};

const EXAM_TYPES = ['CAT 1', 'CAT 2', 'Mid-Term', 'End-Term', 'Mock', 'KCSE Trial', 'Pre-Mock'];
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

type SortDir = 'asc' | 'desc';
type ReportTab = 'marksheet' | 'subject-analysis' | 'class-analysis' | 'progressive' | 'report-card' | 'merit-list' | 'nemis' | 'analytics';

const TABS: { key: ReportTab; label: string; icon: any; emoji: string; desc: string; badge?: string }[] = [
  { key: 'marksheet',       label: 'Mark Sheet',        icon: FiFileText,   emoji: '📋', desc: 'Entry sheet per class' },
  { key: 'subject-analysis',label: 'Subject Analysis',  icon: FiBarChart2,  emoji: '📊', desc: 'Per-subject breakdown' },
  { key: 'class-analysis',  label: 'Class/Form',        icon: FiGrid,       emoji: '🏫', desc: 'Class performance' },
  { key: 'progressive',     label: 'Progressive',       icon: FiTrendingUp, emoji: '📈', desc: 'Progress over time' },
  { key: 'report-card',     label: 'Report Cards',      icon: FiBookOpen,   emoji: '📄', desc: 'End-of-term cards' },
  { key: 'merit-list',      label: 'Merit List',        icon: FiAward,      emoji: '🏆', desc: 'Ranked students', badge: 'TOP' },
  { key: 'analytics',       label: 'Analytics',         icon: FiBarChart2,  emoji: '🎯', desc: 'Advanced insights', badge: 'NEW' },
  { key: 'nemis',           label: 'NEMIS Export',      icon: FiDatabase,   emoji: '🏛️', desc: 'Government export' },
];

// ═══════════════════════════════════════════════════════════════════
//  PREMIUM SCORE CELL
// ═══════════════════════════════════════════════════════════════════
function ScoreCell({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-200 text-xs font-medium">—</span>;
  const g = getGrade(score);
  const pct = score;
  return (
    <div className="flex flex-col items-center gap-0.5 py-0.5">
      <span className="text-xs font-black leading-none" style={{ color: g.color }}>{score}</span>
      <span className="text-[8px] font-bold px-1 rounded-sm leading-none" style={gradeCSS(g.grade)}>{g.grade}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  PAGINATION COMPONENT
// ═══════════════════════════════════════════════════════════════════
function Pagination({ page, total, pageSize, onPage, onPageSize }: {
  page: number; total: number; pageSize: number;
  onPage: (p: number) => void; onPageSize: (n: number) => void;
}) {
  const pages = Math.ceil(total / pageSize);
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between flex-wrap gap-3 px-5 py-3 border-t border-gray-100 bg-gray-50/60">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="font-bold text-gray-700">{start}–{end}</span> of <span className="font-bold text-gray-700">{total}</span> records
        <span className="text-gray-300 mx-1">|</span>
        <span>Per page:</span>
        <select value={pageSize} onChange={e => { onPageSize(Number(e.target.value)); onPage(1); }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white font-bold text-gray-700 focus:ring-2 focus:ring-blue-400 outline-none">
          {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(1)} disabled={page === 1}
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-30 transition-all">
          <FiChevronsLeft size={12} />
        </button>
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-30 transition-all">
          <FiChevronLeft size={12} />
        </button>
        {Array.from({ length: Math.min(5, pages) }, (_, i) => {
          let p = i + 1;
          if (pages > 5) {
            if (page <= 3) p = i + 1;
            else if (page >= pages - 2) p = pages - 4 + i;
            else p = page - 2 + i;
          }
          return (
            <button key={p} onClick={() => onPage(p)}
              className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${p === page
                ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/30 border-0'
                : 'border border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-300'}`}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPage(page + 1)} disabled={page === pages}
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-30 transition-all">
          <FiChevronRight size={12} />
        </button>
        <button onClick={() => onPage(pages)} disabled={page === pages}
          className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-30 transition-all">
          <FiChevronsRight size={12} />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  SORT HEADER BUTTON
// ═══════════════════════════════════════════════════════════════════
function SortTh({ label, sortKey, current, dir, onSort, className = '' }: {
  label: string; sortKey: string; current: string; dir: SortDir;
  onSort: (k: string) => void; className?: string;
}) {
  const active = current === sortKey;
  return (
    <th className={`cursor-pointer select-none group hover:bg-blue-50 transition-colors ${className}`}
      onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1 justify-center">
        <span>{label}</span>
        <span className={`transition-all ${active ? 'text-blue-500' : 'text-gray-300 group-hover:text-gray-400'}`}>
          {active ? (dir === 'asc' ? <FiArrowUp size={10} /> : <FiArrowDown size={10} />) : <FiArrowUp size={10} />}
        </span>
      </div>
    </th>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MINI GRADE BAR (for subject analysis)
// ═══════════════════════════════════════════════════════════════════
function GradeBar({ count, total, grade }: { count: number; total: number; grade: any }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="relative w-5 h-12 bg-gray-100 rounded overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 rounded transition-all duration-700"
          style={{ height: `${pct}%`, backgroundColor: grade.color }} />
      </div>
      <span className="text-[7px] font-bold" style={{ color: grade.color }}>{grade.grade}</span>
      {count > 0 && <span className="text-[6px] text-gray-400">{count}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//  MAIN REPORTS CONTENT
// ═══════════════════════════════════════════════════════════════════
function ReportsContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<ReportTab>((searchParams.get('tab') as ReportTab) || 'marksheet');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Raw data
  const [forms, setForms]             = useState<any[]>([]);
  const [streams, setStreams]         = useState<any[]>([]);
  const [subjects, setSubjects]       = useState<any[]>([]);
  const [students, setStudents]       = useState<any[]>([]);
  const [exams, setExams]             = useState<any[]>([]);
  const [marks, setMarks]             = useState<any[]>([]);
  const [teachers, setTeachers]       = useState<any[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
  const [terms, setTerms]             = useState<any[]>([]);
  const [schoolInfo, setSchoolInfo]   = useState<any>(null);

  // Filters
  const [selForm, setSelForm]         = useState(0);
  const [selStream, setSelStream]     = useState(0);
  const [selExam, setSelExam]         = useState('');
  const [selSubject, setSelSubject]   = useState(0);
  const [selStudent, setSelStudent]   = useState(0);
  const [selExams, setSelExams]       = useState<string[]>([]);
  const [search, setSearch]           = useState('');
  const [nemisFormId, setNemisFormId] = useState('');

  // Grid state
  const [page, setPage]               = useState(1);
  const [pageSize, setPageSize]       = useState(50);
  const [sortKey, setSortKey]         = useState('mean');
  const [sortDir, setSortDir]         = useState<SortDir>('desc');

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir('desc'); }
    setPage(1);
  };

  const fetchAll = useCallback(async () => {
    setRefreshing(true);
    const [fRes, sRes, subRes, stRes, mRes, tRes, stRes2, termRes, schRes] = await Promise.all([
      supabase.from('school_forms').select('*').eq('is_active', true).order('form_level'),
      supabase.from('school_streams').select('*').eq('is_active', true).order('stream_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_students').select('*').order('first_name'),
      supabase.from('school_exam_marks').select('*'),
      supabase.from('school_teachers').select('*').eq('status', 'Active'),
      supabase.from('school_subject_teachers').select('*, school_subjects(subject_name,subject_code), school_teachers(first_name,last_name)'),
      supabase.from('school_terms').select('*').order('id', { ascending: false }),
      supabase.from('school_details').select('*').limit(1).maybeSingle(),
    ]);
    setForms(fRes.data || []);
    setStreams(sRes.data || []);
    setSubjects(subRes.data || []);
    setStudents(stRes.data || []);
    setTeachers(tRes.data || []);
    setSubjectTeachers(stRes2.data || []);
    setTerms(termRes.data || []);
    setSchoolInfo(schRes.data);

    const rawMarks = mRes.data || [];
    const examMap = new Map<string, any>();
    rawMarks.forEach((m: any) => {
      const key = `${m.term_id}_${m.exam_type}`;
      if (!examMap.has(key)) {
        const term = (termRes.data || []).find((t: any) => t.id === m.term_id);
        examMap.set(key, { id: key, exam_name: m.exam_type, term: term?.term_name || '', year: term?.year || new Date().getFullYear(), term_id: m.term_id, exam_type: m.exam_type });
      }
    });
    (termRes.data || []).forEach((t: any) => {
      EXAM_TYPES.forEach(et => {
        const key = `${t.id}_${et}`;
        if (!examMap.has(key)) examMap.set(key, { id: key, exam_name: et, term: t.term_name, year: t.year, term_id: t.id, exam_type: et });
      });
    });
    setExams(Array.from(examMap.values()));
    setMarks(rawMarks.map((m: any) => ({ ...m, exam_id: `${m.term_id}_${m.exam_type}` })));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Helpers ──
  const activeSubjects = useMemo(() => subjects.filter(s => s.is_active !== false), [subjects]);

  const filteredStudents = useMemo(() => students.filter(s => {
    if (s.status !== 'Active') return false;
    if (selForm && s.form_id !== selForm) return false;
    if (selStream && s.stream_id !== selStream) return false;
    if (search && !`${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [students, selForm, selStream, search]);

  const getStudentMarks = (sid: number, eid: string) => marks.filter(m => m.student_id === sid && m.exam_id === eid);

  const exportCSV = (headers: string[], rows: string[][], filename: string) => {
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
    toast.success('Report exported successfully ✓');
  };

  const printArea = (title: string) => {
    const el = document.getElementById('print-area');
    if (!el) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      @page { size: A4 landscape; margin: 10mm; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10px; color: #1a1a1a; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #d1d5db; padding: 4px 6px; }
      th { background: #1e3a8a; color: white; font-weight: 700; text-align: center; }
      tr:nth-child(even) { background: #f8fafc; }
      tr:hover { background: #eff6ff; }
      .grade-A { background: #d1fae5; color: #059669; font-weight: 700; }
      .grade-B { background: #dbeafe; color: #1d4ed8; font-weight: 700; }
      .grade-C { background: #fef9c3; color: #b45309; font-weight: 700; }
      .grade-D { background: #fee2e2; color: #b91c1c; font-weight: 700; }
      .grade-E { background: #fca5a5; color: #7f1d1d; font-weight: 700; }
      .hdr { text-align: center; padding: 12px 0 8px; border-bottom: 3px solid #1e3a8a; margin-bottom: 10px; }
      .hdr h1 { font-size: 18px; color: #1e3a8a; font-weight: 900; text-transform: uppercase; }
      .hdr p { font-size: 10px; color: #6b7280; margin-top: 3px; }
      .sticky-left { position: sticky; left: 0; background: #f8fafc; }
      @media print { body { font-size: 9px; } }
    </style></head><body>
    <div class="hdr"><h1>${schoolInfo?.school_name || 'APSIMS School'}</h1>
    <p>${title} &bull; Generated ${new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p style="font-size:8px;color:#9ca3af;margin-top:2px">Powered by APSIMS &mdash; Kenya #1 School Management System</p></div>
    ${el.innerHTML}</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 600);
  };

  // ════════════════════════════════════════════════════════════════
  //  MARKSHEET TAB
  // ════════════════════════════════════════════════════════════════
  const renderMarkSheet = () => {
    const examSubjects = selSubject ? activeSubjects.filter(s => s.id === selSubject) : activeSubjects;

    const studentResults = useMemo(() => {
      if (!selExam) return [];
      return filteredStudents.map(student => {
        const studentMarks = getStudentMarks(student.id, selExam);
        let total = 0, count = 0, totalPts = 0;
        const subjectScores: Record<number, { score: number; grade: string; pts: number } | null> = {};
        examSubjects.forEach(sub => {
          const mark = studentMarks.find(m => m.subject_id === sub.id);
          if (mark?.score != null) {
            const g = getGrade(mark.score);
            subjectScores[sub.id] = { score: mark.score, grade: g.grade, pts: g.pts };
            total += mark.score; count++; totalPts += g.pts;
          } else subjectScores[sub.id] = null;
        });
        const mean = count > 0 ? Math.round(total / count) : 0;
        return { student, subjectScores, total, mean, count, grade: getGrade(mean).grade, pts: getGrade(mean).pts, totalPts };
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredStudents, selExam, selSubject, marks]);

    const sorted = useMemo(() => {
      const arr = [...studentResults];
      arr.sort((a, b) => {
        if (sortKey === 'name') return sortDir === 'asc' ? a.student.first_name.localeCompare(b.student.first_name) : b.student.first_name.localeCompare(a.student.first_name);
        if (sortKey === 'adm') return sortDir === 'asc' ? (a.student.admission_number || '').localeCompare(b.student.admission_number || '') : (b.student.admission_number || '').localeCompare(a.student.admission_number || '');
        if (sortKey === 'mean') return sortDir === 'desc' ? b.mean - a.mean : a.mean - b.mean;
        if (sortKey === 'total') return sortDir === 'desc' ? b.total - a.total : a.total - b.total;
        const aScore = a.subjectScores[Number(sortKey)]?.score ?? -1;
        const bScore = b.subjectScores[Number(sortKey)]?.score ?? -1;
        return sortDir === 'desc' ? bScore - aScore : aScore - bScore;
      });
      return arr.map((r, rank) => ({ ...r, rank: rank + 1 }));
    }, [studentResults, sortKey, sortDir]);

    const paged = sorted.slice((page - 1) * pageSize, page * pageSize);
    const subjectMeans = examSubjects.map(sub => {
      const subMarks = marks.filter(m => m.subject_id === sub.id && m.exam_id === selExam && m.score != null);
      const formFiltered = selForm ? subMarks.filter(m => {
        const st = students.find(s => s.id === m.student_id);
        return st && st.form_id === selForm;
      }) : subMarks;
      return formFiltered.length > 0 ? Math.round(formFiltered.reduce((s: number, m: any) => s + m.score, 0) / formFiltered.length) : null;
    });

    const examObj = exams.find(e => e.id === selExam);

    const doExport = () => {
      const headers = ['#', 'Adm No', 'Student Name', ...examSubjects.map(s => s.subject_code || s.subject_name), 'Total', 'Mean', 'Grade', 'Pts', 'Rank'];
      const rows = sorted.map((r, i) => [
        String(i + 1), r.student.admission_number || '-', `${r.student.first_name} ${r.student.last_name}`,
        ...examSubjects.map(sub => r.subjectScores[sub.id]?.score != null ? String(r.subjectScores[sub.id]!.score) : '-'),
        String(r.total), String(r.mean), r.grade, String(r.pts), String(r.rank),
      ]);
      exportCSV(headers, rows, `marksheet_${examObj?.exam_name || 'exam'}_${examObj?.term}_${examObj?.year}`);
    };

    return (
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Form</label>
              <select value={selForm} onChange={e => { setSelForm(Number(e.target.value)); setPage(1); }}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[130px]">
                <option value={0}>All Forms</option>
                {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Stream</label>
              <select value={selStream} onChange={e => { setSelStream(Number(e.target.value)); setPage(1); }}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[130px]">
                <option value={0}>All Streams</option>
                {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Exam *</label>
              <select value={selExam} onChange={e => { setSelExam(e.target.value); setPage(1); }}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[200px]">
                <option value="">— Select Exam —</option>
                {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Subject</label>
              <select value={selSubject} onChange={e => { setSelSubject(Number(e.target.value)); setPage(1); }}
                className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[160px]">
                <option value={0}>All Subjects</option>
                {activeSubjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
              </select>
            </div>
            <div className="relative flex-1 min-w-[180px]">
              <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Search Student</label>
              <div className="relative">
                <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Name or Adm No..."
                  className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
              </div>
            </div>
            <div className="flex gap-2 ml-auto">
              <button onClick={doExport} disabled={!selExam}
                className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-40 transition-all">
                <FiDownload size={14} /> CSV
              </button>
              <button onClick={() => printArea(`Mark Sheet — ${examObj?.exam_name || ''} ${examObj?.term || ''} ${examObj?.year || ''}`)} disabled={!selExam}
                className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
                <FiPrinter size={14} /> Print
              </button>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        {selExam && sorted.length > 0 && (() => {
          const withMarks = sorted.filter(r => r.count > 0);
          const overallMean = withMarks.length > 0 ? Math.round(withMarks.reduce((s, r) => s + r.mean, 0) / withMarks.length) : 0;
          const meanGrade = getGrade(overallMean);
          const passRate = withMarks.length > 0 ? Math.round(withMarks.filter(r => r.mean >= 50).length / withMarks.length * 100) : 0;
          const topStudent = sorted[0];
          return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Students',   val: sorted.length,    sub: `${filteredStudents.length} filtered`,   icon: '👥', col: '#2563eb', bg: '#eff6ff' },
                { label: 'Class Mean', val: overallMean,      sub: `Grade ${meanGrade.grade}`,             icon: '📊', col: meanGrade.color, bg: meanGrade.bg },
                { label: 'Pass Rate',  val: `${passRate}%`,   sub: `≥50 marks`,                            icon: '✅', col: passRate >= 70 ? '#059669' : '#ea580c', bg: passRate >= 70 ? '#d1fae5' : '#ffedd5' },
                { label: 'Top Score',  val: sorted[0]?.mean || 0, sub: topStudent ? `${topStudent.student.first_name} ${topStudent.student.last_name}` : '—', icon: '🏆', col: '#7c3aed', bg: '#f5f3ff' },
              ].map((s, i) => (
                <div key={i} className="rounded-2xl p-4 border" style={{ backgroundColor: s.bg, borderColor: `${s.col}22` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.icon}</span>
                    <p className="text-2xl font-black" style={{ color: s.col }}>{s.val}</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase" style={{ color: s.col, opacity: 0.7 }}>{s.label}</p>
                  <p className="text-[9px] text-gray-500 mt-0.5 truncate">{s.sub}</p>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Data Grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
          {/* Grid Header */}
          <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
            <div>
              <h3 className="font-black text-white text-sm">
                📋 Mark Sheet {examObj ? `— ${examObj.exam_name} (${examObj.term} ${examObj.year})` : ''}
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">{sorted.length} students · {examSubjects.length} subjects · Click column header to sort</p>
            </div>
            <div className="flex items-center gap-2">
              {sorted.length > 0 && <span className="text-xs text-emerald-400 font-bold bg-emerald-900/40 px-2 py-1 rounded-lg">{sorted.filter(r => r.count > 0).length} with marks</span>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse" style={{ minWidth: Math.max(600, 280 + examSubjects.length * 70) }}>
              <thead>
                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <th className="px-3 py-3 text-left font-bold text-[10px] uppercase sticky left-0 bg-slate-800 z-20 w-8">#</th>
                  <th className="px-3 py-3 text-left font-bold text-[10px] uppercase sticky left-8 bg-slate-800 z-20 min-w-[90px]">
                    <span className="cursor-pointer hover:text-blue-300" onClick={() => handleSort('adm')}>Adm No {sortKey === 'adm' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  <th className="px-3 py-3 text-left font-bold text-[10px] uppercase sticky left-[130px] bg-slate-800 z-20 min-w-[140px]">
                    <span className="cursor-pointer hover:text-blue-300" onClick={() => handleSort('name')}>Student Name {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}</span>
                  </th>
                  {examSubjects.map(sub => (
                    <th key={sub.id}
                      className="px-1 py-3 text-center font-bold text-[9px] uppercase cursor-pointer hover:bg-slate-600 transition-colors min-w-[60px]"
                      onClick={() => handleSort(String(sub.id))}>
                      <div className="leading-tight">{sub.subject_code || sub.subject_name?.substring(0, 4)}</div>
                      {sortKey === String(sub.id) && <div className="text-blue-300 text-[8px]">{sortDir === 'asc' ? '↑' : '↓'}</div>}
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center font-bold text-[10px] uppercase bg-indigo-900 min-w-[45px] cursor-pointer hover:bg-indigo-800" onClick={() => handleSort('total')}>
                    Tot {sortKey === 'total' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-3 text-center font-bold text-[10px] uppercase bg-indigo-900 min-w-[45px] cursor-pointer hover:bg-indigo-800" onClick={() => handleSort('mean')}>
                    Mean {sortKey === 'mean' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="px-2 py-3 text-center font-bold text-[10px] uppercase bg-indigo-900 min-w-[38px]">Grd</th>
                  <th className="px-2 py-3 text-center font-bold text-[10px] uppercase bg-indigo-900 min-w-[38px]">Pts</th>
                  <th className="px-2 py-3 text-center font-bold text-[10px] uppercase bg-indigo-900 min-w-[38px]">Rank</th>
                </tr>
              </thead>
              <tbody>
                {!selExam ? (
                  <tr><td colSpan={examSubjects.length + 8} className="text-center py-16 text-gray-400">
                    <FiFilter size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Select a form, stream and exam above to load the mark sheet</p>
                  </td></tr>
                ) : paged.length === 0 ? (
                  <tr><td colSpan={examSubjects.length + 8} className="text-center py-12 text-gray-400">No students match current filters</td></tr>
                ) : paged.map((r, i) => {
                  const isTop3 = r.rank <= 3 && r.count > 0;
                  const rowBg = isTop3 ? (r.rank === 1 ? 'bg-yellow-50/60' : r.rank === 2 ? 'bg-gray-50/80' : 'bg-orange-50/40') : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30';
                  return (
                    <tr key={r.student.id} className={`${rowBg} hover:bg-blue-50/40 transition-colors border-b border-gray-50`}>
                      <td className={`px-3 py-1.5 sticky left-0 z-10 text-gray-400 font-bold ${rowBg}`}>
                        {r.rank <= 3 && r.count > 0 ? ['🥇','🥈','🥉'][r.rank - 1] : r.rank}
                      </td>
                      <td className={`px-3 py-1.5 sticky left-8 z-10 font-bold text-blue-600 ${rowBg}`}>{r.student.admission_number || '—'}</td>
                      <td className={`px-3 py-1.5 sticky left-[130px] z-10 font-semibold text-gray-800 ${rowBg}`}>
                        {r.student.first_name} {r.student.last_name}
                        {r.student.stream_id && <span className="ml-1 text-[8px] text-gray-400">{streams.find(s => s.id === r.student.stream_id)?.stream_name}</span>}
                      </td>
                      {examSubjects.map(sub => (
                        <td key={sub.id} className="px-0.5 py-1 text-center border-l border-gray-50">
                          <ScoreCell score={r.subjectScores[sub.id]?.score ?? null} />
                        </td>
                      ))}
                      <td className="px-2 py-1 text-center font-black text-gray-800 bg-indigo-50/40">{r.total || '—'}</td>
                      <td className="px-2 py-1 text-center font-black bg-indigo-50/40">
                        <span className="text-sm font-black" style={{ color: getGrade(r.mean).color }}>{r.mean || '—'}</span>
                      </td>
                      <td className="px-1 py-1 text-center bg-indigo-50/40">
                        {r.count > 0 && <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={gradeCSS(r.grade)}>{r.grade}</span>}
                      </td>
                      <td className="px-2 py-1 text-center font-bold text-indigo-600 bg-indigo-50/40">{r.count > 0 ? r.pts : '—'}</td>
                      <td className="px-2 py-1 text-center font-black text-indigo-700 bg-indigo-50/40">{r.count > 0 ? r.rank : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              {sorted.length > 0 && selExam && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-200 font-bold text-xs border-t-2 border-gray-300">
                    <td colSpan={3} className="px-3 py-2 sticky left-0 bg-slate-100 z-10 font-black text-gray-700">Subject Mean Score</td>
                    {subjectMeans.map((mean, i) => (
                      <td key={i} className="px-0.5 py-2 text-center">
                        {mean !== null ? <ScoreCell score={mean} /> : <span className="text-gray-300">—</span>}
                      </td>
                    ))}
                    <td colSpan={5} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pagination page={page} total={sorted.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  //  SUBJECT ANALYSIS TAB
  // ════════════════════════════════════════════════════════════════
  const renderSubjectAnalysis = () => {
    const subjectData = useMemo(() => {
      return activeSubjects.map(sub => {
        let subMarks = marks.filter(m => m.subject_id === sub.id && m.exam_id === selExam && m.score != null);
        if (selForm) {
          const formIds = new Set(students.filter(s => s.form_id === selForm).map(s => s.id));
          subMarks = subMarks.filter(m => formIds.has(m.student_id));
        }
        if (selStream) {
          const streamIds = new Set(students.filter(s => s.stream_id === selStream).map(s => s.id));
          subMarks = subMarks.filter(m => streamIds.has(m.student_id));
        }
        const scores = subMarks.map(m => m.score as number);
        const mean = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const highest = scores.length > 0 ? Math.max(...scores) : 0;
        const lowest = scores.length > 0 ? Math.min(...scores) : 0;
        const gradeDist: Record<string, number> = {};
        KCSE_GRADES.forEach(g => { gradeDist[g.grade] = 0; });
        scores.forEach(s => { gradeDist[getGrade(s).grade]++; });
        const passCount = scores.filter(s => s >= 50).length;
        const passRate = scores.length > 0 ? Math.round(passCount / scores.length * 100) : 0;
        const teacher = subjectTeachers.find(st => st.subject_id === sub.id);
        const teacherName = teacher ? `${teacher.school_teachers?.first_name || ''} ${teacher.school_teachers?.last_name || ''}`.trim() : '—';
        return { sub, scores, mean, highest, lowest, gradeDist, passRate, teacherName };
      }).sort((a, b) => b.mean - a.mean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeSubjects, marks, selExam, selForm, selStream]);

    const doExport = () => {
      const headers = ['#', 'Code', 'Subject', 'Entries', 'Mean', 'Grade', 'Highest', 'Lowest', 'Pass Rate %', 'Teacher', ...KCSE_GRADES.map(g => `Grade ${g.grade}`)];
      const rows = subjectData.map((d, i) => [
        String(i + 1), d.sub.subject_code || '', d.sub.subject_name, String(d.scores.length),
        String(d.mean), getGrade(d.mean).grade, String(d.highest), String(d.lowest), `${d.passRate}%`, d.teacherName,
        ...KCSE_GRADES.map(g => String(d.gradeDist[g.grade] || 0)),
      ]);
      const examObj = exams.find(e => e.id === selExam);
      exportCSV(headers, rows, `subject_analysis_${examObj?.exam_name || 'exam'}_${examObj?.year || ''}`);
    };

    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Exam *</label>
            <select value={selExam} onChange={e => setSelExam(e.target.value)}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[210px]">
              <option value="">— Select Exam —</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Form</label>
            <select value={selForm} onChange={e => setSelForm(Number(e.target.value))}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[130px]">
              <option value={0}>All Forms</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Stream</label>
            <select value={selStream} onChange={e => setSelStream(Number(e.target.value))}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[130px]">
              <option value={0}>All Streams</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={doExport} disabled={!selExam}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-40 transition-all">
              <FiDownload size={14} /> CSV
            </button>
            <button onClick={() => printArea('Subject Analysis Report')} disabled={!selExam}
              className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
              <FiPrinter size={14} /> Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
          <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900">
            <h3 className="font-black text-white text-sm">📊 Subject Analysis Report</h3>
            <p className="text-slate-400 text-[10px] mt-0.5">{activeSubjects.length} subjects · Sorted by mean score · KCSE grade distribution</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase w-8">#</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase">Code</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase min-w-[150px]">Subject</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase">Entries</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase bg-indigo-900">Mean</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase bg-indigo-900">Grade</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-green-300">High</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase text-red-300">Low</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase min-w-[100px]">Pass Rate</th>
                  <th className="px-3 py-3 text-center text-[10px] font-bold uppercase min-w-[200px]">Grade Distribution</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase min-w-[120px]">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {!selExam ? (
                  <tr><td colSpan={11} className="text-center py-16 text-gray-400">
                    <FiBarChart2 size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Select an exam to view subject analysis</p>
                  </td></tr>
                ) : subjectData.filter(d => d.scores.length > 0).map((d, i) => {
                  const g = getGrade(d.mean);
                  return (
                    <tr key={d.sub.id} className={`border-b border-gray-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-blue-50/30 transition-colors`}>
                      <td className="px-3 py-2.5 text-gray-400 font-bold">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <span className="font-black text-[10px] px-2 py-1 rounded-lg" style={{ color: g.color, backgroundColor: g.bg }}>
                          {d.sub.subject_code || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{d.sub.subject_name}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-600">{d.scores.length}</td>
                      <td className="px-3 py-2.5 text-center bg-indigo-50/30">
                        <span className="text-base font-black" style={{ color: g.color }}>{d.mean}</span>
                      </td>
                      <td className="px-2 py-2.5 text-center bg-indigo-50/30">
                        <span className="text-xs font-black px-2 py-0.5 rounded-lg" style={gradeCSS(g.grade)}>{g.grade}</span>
                      </td>
                      <td className="px-3 py-2.5 text-center font-bold text-emerald-600">{d.highest}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-red-500">{d.lowest}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${d.passRate}%`, backgroundColor: d.passRate >= 70 ? '#059669' : d.passRate >= 50 ? '#f59e0b' : '#dc2626' }} />
                          </div>
                          <span className="text-[10px] font-black w-8 text-right"
                            style={{ color: d.passRate >= 70 ? '#059669' : d.passRate >= 50 ? '#d97706' : '#dc2626' }}>
                            {d.passRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1">
                        <div className="flex items-end gap-0.5 h-14">
                          {KCSE_GRADES.slice(0, 8).map(g => (
                            <GradeBar key={g.grade} count={d.gradeDist[g.grade] || 0} total={d.scores.length} grade={g} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-[10px]">{d.teacherName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  //  MERIT LIST TAB
  // ════════════════════════════════════════════════════════════════
  const renderMeritList = () => {
    const meritData = useMemo(() => {
      if (!selExam) return [];
      return filteredStudents.map(student => {
        const studentMarks = getStudentMarks(student.id, selExam);
        let total = 0, count = 0;
        studentMarks.forEach(m => { if (m.score != null) { total += m.score; count++; } });
        const mean = count > 0 ? Math.round(total / count) : 0;
        const g = getGrade(mean);
        const form = forms.find(f => f.id === student.form_id);
        const stream = streams.find(s => s.id === student.stream_id);
        return { student, mean, total, count, grade: g.grade, pts: g.pts, form, stream };
      }).filter(r => r.count > 0).sort((a, b) => b.mean - a.mean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filteredStudents, selExam, marks]);

    const paginated = meritData.slice((page - 1) * pageSize, page * pageSize);
    const examObj = exams.find(e => e.id === selExam);

    const doExport = () => {
      const headers = ['Rank', 'Adm No', 'Student Name', 'Form', 'Stream', 'Total', 'Mean', 'Grade', 'Points'];
      const rows = meritData.map((r, i) => [
        String(i + 1), r.student.admission_number || '', `${r.student.first_name} ${r.student.last_name}`,
        r.form?.form_name || '', r.stream?.stream_name || '', String(r.total), String(r.mean), r.grade, String(r.pts),
      ]);
      exportCSV(headers, rows, `merit_list_${examObj?.exam_name || 'exam'}_${examObj?.year}`);
    };

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">🏆</div>
              <div>
                <h2 className="text-xl font-black">Merit List</h2>
                <p className="text-amber-100 text-sm">Student performance ranking — {examObj?.exam_name || 'Select exam'}</p>
              </div>
            </div>
            {meritData.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[
                  { rank: 1, icon: '🥇', r: meritData[0] },
                  { rank: 2, icon: '🥈', r: meritData[1] },
                  { rank: 3, icon: '🥉', r: meritData[2] },
                ].filter(x => x.r).map(x => (
                  <div key={x.rank} className="bg-white/15 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                    <div className="text-2xl mb-1">{x.icon}</div>
                    <p className="font-black text-sm truncate">{x.r.student.first_name} {x.r.student.last_name}</p>
                    <p className="text-amber-100 text-xs">{x.r.student.admission_number}</p>
                    <p className="text-2xl font-black mt-1">{x.r.mean}<span className="text-xs text-amber-200 ml-1">{x.r.grade}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Exam *</label>
            <select value={selExam} onChange={e => { setSelExam(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[210px]">
              <option value="">— Select Exam —</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Form</label>
            <select value={selForm} onChange={e => { setSelForm(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[130px]">
              <option value={0}>All Forms</option>
              {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Stream</label>
            <select value={selStream} onChange={e => { setSelStream(Number(e.target.value)); setPage(1); }}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[130px]">
              <option value={0}>All Streams</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Search</label>
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search student..." className="pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
            </div>
          </div>
          <div className="flex gap-2 ml-auto">
            <button onClick={doExport} disabled={!selExam}
              className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-emerald-100 disabled:opacity-40 transition-all">
              <FiDownload size={14} /> Export
            </button>
            <button onClick={() => printArea(`Merit List — ${examObj?.exam_name || ''}`)} disabled={!selExam}
              className="px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-blue-100 disabled:opacity-40 transition-all">
              <FiPrinter size={14} /> Print
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="print-area">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500 to-yellow-600 text-white">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase w-12">Rank</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase">Adm No</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase">Student Name</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase">Form</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase">Stream</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase">Total</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase">Mean %</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase">Grade</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase">Points</th>
                  <th className="px-4 py-3 text-center text-[10px] font-bold uppercase">Performance</th>
                </tr>
              </thead>
              <tbody>
                {!selExam ? (
                  <tr><td colSpan={10} className="text-center py-16 text-gray-400">
                    <FiAward size={32} className="mx-auto mb-3 opacity-30" />
                    <p>Select an exam to generate the merit list</p>
                  </td></tr>
                ) : paginated.map((r, i) => {
                  const globalRank = (page - 1) * pageSize + i + 1;
                  const g = getGrade(r.mean);
                  const medal = globalRank === 1 ? '🥇' : globalRank === 2 ? '🥈' : globalRank === 3 ? '🥉' : null;
                  return (
                    <tr key={r.student.id} className={`border-b border-gray-50 transition-colors hover:bg-amber-50/30 ${globalRank <= 3 ? 'bg-amber-50/20' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                      <td className="px-4 py-3 text-center">
                        {medal ? <span className="text-xl">{medal}</span> : <span className="font-black text-gray-500 text-lg">{globalRank}</span>}
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600">{r.student.admission_number || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-800">{r.student.first_name} {r.student.last_name}</div>
                        {r.student.kcpe_marks && <div className="text-[10px] text-gray-400">KCPE: {r.student.kcpe_marks}</div>}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-600 font-medium">{r.form?.form_name || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{r.stream?.stream_name || '—'}</td>
                      <td className="px-4 py-3 text-center font-black text-gray-800">{r.total}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-lg font-black" style={{ color: g.color }}>{r.mean}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-black px-3 py-1 rounded-xl" style={gradeCSS(r.grade)}>{r.grade}</span>
                      </td>
                      <td className="px-4 py-3 text-center font-black text-indigo-600">{r.pts}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.mean}%`, backgroundColor: g.color }} />
                          </div>
                          <span className="text-[10px] text-gray-500 w-8 text-right">{r.mean}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={meritData.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  //  NEMIS EXPORT TAB
  // ════════════════════════════════════════════════════════════════
  const renderNEMIS = () => {
    const nemisStudents = students.filter(s => {
      if (s.status !== 'Active') return false;
      if (nemisFormId && String(s.form_id) !== nemisFormId) return false;
      return true;
    });
    const paginated = nemisStudents.slice((page - 1) * pageSize, page * pageSize);

    const exportNEMIS = () => {
      const headers = ['#', 'NEMIS No', 'First Name', 'Middle Name', 'Last Name', 'Gender', 'Date of Birth', 'Nationality', 'County', 'Sub-County', 'Religion', 'KCPE Index', 'KCPE Marks', 'Admission No', 'Form/Grade', 'Stream', 'Year Admitted', 'Guardian Name', 'Guardian Phone', 'Special Needs'];
      const rows = nemisStudents.map((s, i) => {
        const form = forms.find(f => f.id === s.form_id);
        const stream = streams.find(st => st.id === s.stream_id);
        return [
          String(i + 1), s.nemis_number || '', s.first_name || '', s.middle_name || '', s.last_name || '',
          s.gender || '', s.date_of_birth || '', s.nationality || 'Kenyan', s.county || '', s.sub_county || '',
          s.religion || '', s.kcpe_index_number || '', String(s.kcpe_marks || ''),
          s.admission_number || '', form?.form_name || '', stream?.stream_name || '',
          String(s.year_of_admission || ''), s.guardian_name || '', s.guardian_phone || '', s.special_needs || 'None',
        ];
      });
      exportCSV(headers, rows, `NEMIS_export_${new Date().getFullYear()}`);
    };

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-indigo-900 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'30\' height=\'30\' viewBox=\'0 0 30 30\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M15 0L30 15L15 30L0 15Z\' fill=\'%23ffffff\' fill-opacity=\'0.5\'/%3E%3C/svg%3E")' }} />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center text-3xl">🏛️</div>
              <div>
                <h2 className="text-xl font-black">NEMIS Data Export</h2>
                <p className="text-slate-300 text-sm">National Education Management Information System — Ministry of Education Kenya</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Total Active', val: students.filter(s => s.status === 'Active').length, icon: '👥' },
                { label: 'NEMIS Registered', val: students.filter(s => s.nemis_number).length, icon: '✅' },
                { label: 'Missing NEMIS', val: students.filter(s => s.status === 'Active' && !s.nemis_number).length, icon: '⚠️' },
                { label: 'Export Ready', val: nemisStudents.length, icon: '📤' },
              ].map((s, i) => (
                <div key={i} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                  <span className="text-xl">{s.icon}</span>
                  <p className="text-2xl font-black mt-1">{s.val}</p>
                  <p className="text-[10px] text-slate-300 font-bold uppercase">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Form / Grade</label>
            <select value={nemisFormId} onChange={e => { setNemisFormId(e.target.value); setPage(1); }}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[150px]">
              <option value="">All Forms</option>
              {forms.map(f => <option key={f.id} value={String(f.id)}>{f.form_name}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Search</label>
            <div className="relative">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Name, Adm No, NEMIS..." className="pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none" />
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={exportNEMIS}
              className="px-5 py-2.5 text-white rounded-xl text-sm font-black flex items-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', boxShadow: '0 4px 15px rgba(30,58,138,0.35)' }}>
              <FiDownload size={15} /> Export NEMIS CSV
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-between">
            <h3 className="font-black text-white text-sm">🏛️ NEMIS Student Register</h3>
            <span className="text-xs text-emerald-400 font-bold bg-emerald-900/40 px-2 py-1 rounded-lg">{nemisStudents.length} students</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-slate-700 to-slate-800 text-white">
                  {['#', 'NEMIS No', 'Adm No', 'Student Name', 'Gender', 'DOB', 'KCPE', 'Form', 'Stream', 'Guardian', 'Phone', 'Status'].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[10px] font-bold uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={12} className="text-center py-12 text-gray-400">
                    <FiDatabase size={28} className="mx-auto mb-2 opacity-30" />
                    <p>No students found</p>
                  </td></tr>
                ) : paginated.map((s, i) => {
                  const form = forms.find(f => f.id === s.form_id);
                  const stream = streams.find(st => st.id === s.stream_id);
                  const hasNEMIS = !!s.nemis_number;
                  return (
                    <tr key={s.id} className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                      <td className="px-3 py-2.5 text-gray-400 font-bold">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-3 py-2.5">
                        {hasNEMIS
                          ? <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{s.nemis_number}</span>
                          : <span className="text-red-400 text-[10px] font-bold">⚠️ MISSING</span>}
                      </td>
                      <td className="px-3 py-2.5 font-bold text-blue-600">{s.admission_number || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{s.first_name} {s.middle_name ? s.middle_name + ' ' : ''}{s.last_name}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.gender === 'Male' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                          {s.gender || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{s.date_of_birth || '—'}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-gray-700">{s.kcpe_marks || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-700 font-medium">{form?.form_name || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{stream?.stream_name || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{s.guardian_name || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600 font-mono">{s.guardian_phone || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={nemisStudents.length} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  //  ANALYTICS TAB — Visual grade distribution heatmap
  // ════════════════════════════════════════════════════════════════
  const renderAnalytics = () => {
    const formPerformance = forms.map(form => {
      const formStudents = students.filter(s => s.form_id === form.id && s.status === 'Active');
      const examMeans = selExam ? formStudents.map(st => {
        const sm = marks.filter(m => m.student_id === st.id && m.exam_id === selExam && m.score != null);
        return sm.length > 0 ? Math.round(sm.reduce((a, m) => a + m.score, 0) / sm.length) : null;
      }).filter(m => m !== null) as number[] : [];
      const classMean = examMeans.length > 0 ? Math.round(examMeans.reduce((a, b) => a + b, 0) / examMeans.length) : 0;
      return { form, classMean, studentCount: formStudents.length, markedCount: examMeans.length };
    });

    return (
      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Exam</label>
            <select value={selExam} onChange={e => setSelExam(e.target.value)}
              className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-blue-400 outline-none min-w-[210px]">
              <option value="">— Select Exam —</option>
              {exams.map(e => <option key={e.id} value={e.id}>{e.exam_name} ({e.term} {e.year})</option>)}
            </select>
          </div>
        </div>

        {/* Form Performance Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {formPerformance.map(fp => {
            const g = fp.classMean > 0 ? getGrade(fp.classMean) : null;
            return (
              <div key={fp.form.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-black text-gray-800">{fp.form.form_name}</h3>
                  {g && <span className="text-lg font-black px-2 py-1 rounded-xl" style={gradeCSS(g.grade)}>{g.grade}</span>}
                </div>
                <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${fp.classMean}%`, backgroundColor: g?.color || '#e5e7eb' }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black" style={{ color: g?.color || '#9ca3af' }}>{fp.classMean || '—'}</span>
                  <span className="text-xs text-gray-400">{fp.markedCount}/{fp.studentCount} students</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Grade Distribution Heatmap */}
        {selExam && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-slate-800 to-slate-900">
              <h3 className="font-black text-white text-sm">🎯 Grade Distribution Heatmap</h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Student count per grade per form — reveals performance patterns</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Grade</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Range</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Pts</th>
                    {forms.map(f => <th key={f.id} className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">{f.form_name}</th>)}
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-700 uppercase bg-indigo-50">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {KCSE_GRADES.map(grade => {
                    const formCounts = forms.map(form => {
                      const formStudentIds = new Set(students.filter(s => s.form_id === form.id && s.status === 'Active').map(s => s.id));
                      return marks.filter(m => m.exam_id === selExam && m.score != null && formStudentIds.has(m.student_id) && getGrade(m.score).grade === grade.grade).length;
                    });
                    const total = formCounts.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={grade.grade} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <span className="text-sm font-black px-2.5 py-1 rounded-lg" style={gradeCSS(grade.grade)}>{grade.grade}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">{grade.min}–{grade.max}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-gray-700">{grade.pts}</td>
                        {formCounts.map((count, i) => (
                          <td key={i} className="px-4 py-2.5 text-center">
                            {count > 0 ? (
                              <span className="text-sm font-black px-2 py-0.5 rounded" style={{ color: grade.color, backgroundColor: grade.bg }}>
                                {count}
                              </span>
                            ) : <span className="text-gray-200">—</span>}
                          </td>
                        ))}
                        <td className="px-4 py-2.5 text-center font-black bg-indigo-50/50">
                          {total > 0 ? <span className="text-gray-800">{total}</span> : <span className="text-gray-200">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════
  //  MAIN RENDER
  // ════════════════════════════════════════════════════════════════
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f1f5f9' }}>
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center animate-pulse"
          style={{ background: 'linear-gradient(135deg,#1e3a8a,#6366f1)' }}>
          <FiFileText size={28} className="text-white" />
        </div>
        <p className="font-black text-gray-700 text-lg">Loading Reports & Analytics</p>
        <p className="text-gray-400 text-sm mt-1">Fetching all academic data...</p>
        <div className="mt-4 flex gap-1 justify-center">
          {[0,1,2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e8f0fe 100%)' }}>
      {/* ── PREMIUM HEADER ── */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #1e3a8a 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #6366f1 0%, transparent 50%), radial-gradient(circle at 80% 20%, #0891b2 0%, transparent 50%)' }} />
        <div className="relative z-10 max-w-full px-6 py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>📊</div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight">Reports & NEMIS Center</h1>
                  <p className="text-slate-400 text-sm">Academic analytics · KCSE grading · NEMIS export — Kenya #1</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Quick stats */}
              {[
                { v: students.filter(s => s.status === 'Active').length, l: 'Active Students', e: '👥' },
                { v: subjects.filter(s => s.is_active !== false).length, l: 'Subjects', e: '📚' },
                { v: exams.filter(e => marks.some(m => m.exam_id === e.id)).length, l: 'Exams w/ Marks', e: '📝' },
              ].map((s, i) => (
                <div key={i} className="text-center bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
                  <p className="text-lg font-black text-white">{s.v}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{s.l}</p>
                </div>
              ))}
              <button onClick={() => fetchAll()} disabled={refreshing}
                className="p-2.5 bg-white/10 border border-white/20 rounded-xl text-slate-300 hover:bg-white/20 transition-all disabled:opacity-50">
                <FiRefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mt-5 overflow-x-auto pb-1">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button key={tab.key} onClick={() => { setActiveTab(tab.key); setPage(1); }}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                    active
                      ? 'text-white shadow-lg shadow-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                  }`}
                  style={active ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                  <span>{tab.emoji}</span>
                  <span>{tab.label}</span>
                  {tab.badge && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${active ? 'bg-white/20' : 'bg-amber-500 text-white'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-full px-6 py-6">
        {activeTab === 'marksheet'        && renderMarkSheet()}
        {activeTab === 'subject-analysis' && renderSubjectAnalysis()}
        {activeTab === 'merit-list'       && renderMeritList()}
        {activeTab === 'nemis'            && renderNEMIS()}
        {activeTab === 'analytics'        && renderAnalytics()}
        {/* Remaining tabs redirect to base render */}
        {!['marksheet','subject-analysis','merit-list','nemis','analytics'].includes(activeTab) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">{TABS.find(t => t.key === activeTab)?.emoji}</div>
            <h2 className="text-xl font-black text-gray-700">{TABS.find(t => t.key === activeTab)?.label}</h2>
            <p className="text-gray-400 mt-2">{TABS.find(t => t.key === activeTab)?.desc}</p>
            <p className="text-indigo-500 text-sm mt-4 font-medium">🚀 Ultra premium upgrade coming next sprint</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Loading Reports...</p>
        </div>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  );
}

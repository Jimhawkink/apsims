'use client';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { fmt } from '@/hooks/useUltraFeeCollect';

interface SearchResult {
  id: number;
  first_name: string;
  last_name: string;
  other_name?: string;
  admission_no?: string;
  admission_number?: string;
  form_id: number;
  stream_id: number;
  guardian_phone?: string;
  guardian_name?: string;
  nemis_no?: string;
  nemis_number?: string;
  gender?: string;
  status?: string;
}

interface Props {
  searchFn: (query: string) => SearchResult[];
  onSelect: (student: SearchResult) => void;
  getFormName: (id: number) => string;
  getStreamName: (id: number) => string;
  getFeeBalance: (studentId: number, formId: number) => { termBalance: number; annualBalance: number; totalPaid: number };
  selectedStudent: SearchResult | null;
  allStudents?: SearchResult[];
  forms?: { id: number; form_name: string }[];
  streams?: { id: number; stream_name: string }[];
}

// Mini SVG ring for fee payment progress
function FeeRingMini({ pct, size = 36 }: { pct: number; size?: number }) {
  const color = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : pct >= 20 ? '#f97316' : '#ef4444';
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct / 100)) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={4.5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={4.5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// Avatar circle
function Avatar({ student, size = 44 }: { student: SearchResult; size?: number }) {
  const isFemale = student.gender === 'Female';
  const bg = isFemale
    ? 'linear-gradient(135deg,#ec4899,#f472b6)'
    : 'linear-gradient(135deg,#6366f1,#818cf8)';
  const initials = `${student.first_name?.charAt(0) ?? ''}${student.last_name?.charAt(0) ?? ''}`;
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 900, fontSize: size * 0.3, flexShrink: 0,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    }}>
      {initials}
    </div>
  );
}

export default function UltraFeeSearch({
  searchFn, onSelect, getFormName, getStreamName, getFeeBalance,
  selectedStudent, allStudents = [], forms = [], streams = [],
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [filterForm, setFilterForm] = useState(0);
  const [filterStream, setFilterStream] = useState(0);
  const [filterStatus, setFilterStatus] = useState<'all' | 'owing' | 'cleared' | 'overpaid'>('all');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const getAdm = (s: SearchResult) => s.admission_no || s.admission_number || '';

  // Filter allStudents by chips when no query
  const chipFiltered = useMemo(() => {
    return allStudents.filter(s => {
      if (filterForm && s.form_id !== filterForm) return false;
      if (filterStream && s.stream_id !== filterStream) return false;
      if (filterStatus !== 'all') {
        const bal = getFeeBalance(s.id, s.form_id);
        if (filterStatus === 'owing' && bal.termBalance <= 0) return false;
        if (filterStatus === 'cleared' && bal.termBalance > 0) return false;
        if (filterStatus === 'overpaid' && !(bal.totalPaid > 0 && bal.termBalance <= 0)) return false;
      }
      return true;
    }).slice(0, 50);
  }, [allStudents, filterForm, filterStream, filterStatus, getFeeBalance]);

  // Search results filtered by chips too
  const filteredResults = useMemo(() => {
    return results.filter(s => {
      if (filterForm && s.form_id !== filterForm) return false;
      if (filterStream && s.stream_id !== filterStream) return false;
      if (filterStatus !== 'all') {
        const bal = getFeeBalance(s.id, s.form_id);
        if (filterStatus === 'owing' && bal.termBalance <= 0) return false;
        if (filterStatus === 'cleared' && bal.termBalance > 0) return false;
        if (filterStatus === 'overpaid' && !(bal.totalPaid > 0 && bal.termBalance <= 0)) return false;
      }
      return true;
    });
  }, [results, filterForm, filterStream, filterStatus, getFeeBalance]);

  const displayList = query.trim().length >= 1 ? filteredResults : chipFiltered;

  useEffect(() => {
    if (query.trim().length >= 1) {
      const found = searchFn(query);
      setResults(found);
      setHighlightIndex(-1);
    } else {
      setResults([]);
      setHighlightIndex(-1);
    }
  }, [query, searchFn]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(p => Math.min(p + 1, displayList.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(p => Math.max(p - 1, 0)); }
    else if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); handleSelect(displayList[highlightIndex]); }
    else if (e.key === 'Escape') { setShowDropdown(false); inputRef.current?.blur(); }
  };

  const handleSelect = useCallback((student: SearchResult) => {
    onSelect(student);
    setQuery('');
    setShowDropdown(false);
    setIsFocused(false);
    setResults([]);
  }, [onSelect]);

  const handleFocus = () => {
    setIsFocused(true);
    setShowDropdown(true);
  };

  // Stats for empty state
  const stats = useMemo(() => {
    if (!allStudents.length) return null;
    const balances = allStudents.map(s => getFeeBalance(s.id, s.form_id).termBalance);
    const owing = balances.filter(b => b > 0).length;
    const cleared = balances.filter(b => b <= 0).length;
    const totalOwing = balances.filter(b => b > 0).reduce((a, b) => a + b, 0);
    return { total: allStudents.length, owing, cleared, totalOwing };
  }, [allStudents, getFeeBalance]);

  const STATUS_FILTERS = [
    { key: 'all', label: 'All', color: '#6366f1' },
    { key: 'owing', label: '⚠️ Owing', color: '#ef4444' },
    { key: 'cleared', label: '✅ Cleared', color: '#10b981' },
    { key: 'overpaid', label: '💚 Overpaid', color: '#059669' },
  ] as const;

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      {/* ── SELECTED STUDENT BADGE ── */}
      {selectedStudent && !isFocused && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', borderRadius: 16,
          background: 'linear-gradient(135deg,#eef2ff,#ede9fe)',
          border: '2px solid #c7d2fe', marginBottom: 8,
        }}>
          <Avatar student={selectedStudent} size={40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#1e1b4b' }}>
              {selectedStudent.first_name} {selectedStudent.last_name}
            </div>
            <div style={{ fontSize: 11, color: '#6d6afe', marginTop: 2, display: 'flex', gap: 6 }}>
              <span style={{ fontFamily: 'monospace', background: '#c7d2fe', padding: '1px 6px', borderRadius: 5, color: '#3730a3', fontWeight: 700 }}>
                {getAdm(selectedStudent)}
              </span>
              <span>{getFormName(selectedStudent.form_id)} · {getStreamName(selectedStudent.stream_id)}</span>
              {selectedStudent.guardian_phone && <span>📱 {selectedStudent.guardian_phone}</span>}
            </div>
          </div>
          <button
            onClick={() => { setIsFocused(true); setShowDropdown(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            style={{
              padding: '6px 14px', borderRadius: 10, fontSize: 11, fontWeight: 700,
              color: '#4f46e5', background: '#e0e7ff', border: '1px solid #c7d2fe', cursor: 'pointer',
            }}
          >
            Change Student
          </button>
        </div>
      )}

      {/* ── FILTER CHIPS ── */}
      {(isFocused || showDropdown || !selectedStudent) && (
        <div style={{ marginBottom: 10 }}>
          {/* Form chips */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', marginRight: 2 }}>Form:</span>
            {[{ id: 0, form_name: 'All' }, ...forms].map(f => (
              <button key={f.id} onClick={() => setFilterForm(f.id)}
                style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: '1.5px solid',
                  background: filterForm === f.id ? '#6366f1' : '#f8fafc',
                  color: filterForm === f.id ? '#fff' : '#64748b',
                  borderColor: filterForm === f.id ? '#6366f1' : '#e2e8f0',
                  transition: 'all 0.15s',
                }}>{f.form_name}</button>
            ))}
            {streams.length > 0 && (
              <>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', marginLeft: 8, marginRight: 2 }}>Stream:</span>
                {[{ id: 0, stream_name: 'All' }, ...streams].map(s => (
                  <button key={s.id} onClick={() => setFilterStream(s.id)}
                    style={{
                      padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: '1.5px solid',
                      background: filterStream === s.id ? '#8b5cf6' : '#f8fafc',
                      color: filterStream === s.id ? '#fff' : '#64748b',
                      borderColor: filterStream === s.id ? '#8b5cf6' : '#e2e8f0',
                      transition: 'all 0.15s',
                    }}>{s.stream_name}</button>
                ))}
              </>
            )}
          </div>
          {/* Status chips */}
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', alignSelf: 'center', marginRight: 2 }}>Status:</span>
            {STATUS_FILTERS.map(sf => (
              <button key={sf.key} onClick={() => setFilterStatus(sf.key)}
                style={{
                  padding: '4px 12px', borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: '1.5px solid',
                  background: filterStatus === sf.key ? sf.color : '#f8fafc',
                  color: filterStatus === sf.key ? '#fff' : '#64748b',
                  borderColor: filterStatus === sf.key ? sf.color : '#e2e8f0',
                  transition: 'all 0.15s',
                }}>{sf.label}</button>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH INPUT ── */}
      <div style={{ position: 'relative' }}>
        {/* Search icon */}
        <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 2, pointerEvents: 'none' }}>
          <svg width={18} height={18} fill="none" stroke={isFocused ? '#6366f1' : '#94a3b8'} strokeWidth={2.2} viewBox="0 0 24 24"
            style={{ transition: 'stroke 0.2s' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, admission no, NEMIS, or parent phone…"
          autoComplete="off"
          style={{
            width: '100%', paddingLeft: 46, paddingRight: query ? 80 : 16,
            paddingTop: 14, paddingBottom: 14,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            border: `2px solid ${isFocused ? '#6366f1' : '#e2e8f0'}`,
            borderRadius: 16, fontSize: 14, fontWeight: 500, color: '#1e293b',
            outline: 'none', boxSizing: 'border-box', width: '100%',
            boxShadow: isFocused ? '0 0 0 4px rgba(99,102,241,0.12)' : '0 4px 16px rgba(0,0,0,0.06)',
            transition: 'all 0.2s ease',
          } as React.CSSProperties}
        />

        {/* Right side of input */}
        <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {query && (
            <span style={{
              background: '#6366f1', color: '#fff', borderRadius: 99,
              fontSize: 10, fontWeight: 700, padding: '2px 8px',
            }}>
              {displayList.length}
            </span>
          )}
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); inputRef.current?.focus(); }}
              style={{
                width: 24, height: 24, borderRadius: 99, border: 'none',
                background: '#f1f5f9', cursor: 'pointer', color: '#64748b',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
              }}
            >✕</button>
          )}
        </div>
        {/* Typing pulse */}
        {query.length > 0 && (
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6366f1', animation: 'pulse 1s infinite' }} />
          </div>
        )}
      </div>

      {/* ── DROPDOWN ── */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, zIndex: 9999,
          background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(99,102,241,0.18)', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.14), 0 0 0 1px rgba(99,102,241,0.08)',
          maxHeight: 520, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          animation: 'dropSlide 0.18s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '10px 16px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {query ? `${displayList.length} result${displayList.length !== 1 ? 's' : ''}` : `${displayList.length} students`}
              {filterForm > 0 || filterStream > 0 || filterStatus !== 'all' ? ' (filtered)' : ''}
            </span>
            <span style={{ fontSize: 10, color: '#c7d2fe', fontWeight: 600 }}>↑↓ Navigate · Enter Select · Esc Close</span>
          </div>

          {/* Stats bar when no query */}
          {!query && stats && (
            <div style={{
              display: 'flex', gap: 0, borderBottom: '1px solid #f1f5f9', flexShrink: 0,
            }}>
              {[
                { label: 'Total', val: stats.total, color: '#6366f1', bg: '#eef2ff' },
                { label: 'Owing', val: stats.owing, color: '#ef4444', bg: '#fef2f2' },
                { label: 'Cleared', val: stats.cleared, color: '#10b981', bg: '#f0fdf4' },
                { label: 'Total Due', val: `KES ${(stats.totalOwing / 1000).toFixed(0)}K`, color: '#f59e0b', bg: '#fffbeb' },
              ].map((s, i) => (
                <div key={i} style={{
                  flex: 1, textAlign: 'center', padding: '8px 4px',
                  background: s.bg, borderRight: i < 3 ? '1px solid #f1f5f9' : 'none',
                }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: s.color }}>{s.val}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Results list */}
          <div ref={listRef} style={{ overflowY: 'auto', flex: 1 }}>
            {displayList.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>
                  {query ? 'No students found' : 'No students match filters'}
                </p>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>
                  {query ? 'Try a different name, admission number or phone' : 'Try changing the filter chips above'}
                </p>
              </div>
            ) : displayList.map((student, idx) => {
              const adm = getAdm(student);
              const fees = getFeeBalance(student.id, student.form_id);
              const annualPct = fees.totalPaid > 0
                ? Math.min(100, Math.round((fees.totalPaid / Math.max(1, fees.totalPaid + fees.annualBalance)) * 100))
                : 0;
              const isHighlighted = idx === highlightIndex;
              const isInactive = student.status === 'Inactive';
              const isCleared = fees.termBalance <= 0;

              return (
                <button
                  key={student.id}
                  onClick={() => handleSelect(student)}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    border: 'none', cursor: 'pointer',
                    background: isHighlighted
                      ? 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))'
                      : 'transparent',
                    borderBottom: '1px solid rgba(241,245,249,0.8)',
                    transition: 'background 0.1s',
                    opacity: isInactive ? 0.6 : 1,
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar student={student} size={42} />
                    <div style={{
                      position: 'absolute', bottom: -2, right: -2,
                      width: 14, height: 14, borderRadius: '50%',
                      background: isCleared ? '#10b981' : fees.termBalance > 5000 ? '#ef4444' : '#f59e0b',
                      border: '2px solid white',
                    }} />
                  </div>

                  {/* Student info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {student.first_name} {student.other_name ? student.other_name + ' ' : ''}{student.last_name}
                      </span>
                      {isInactive && (
                        <span style={{ fontSize: 8, fontWeight: 700, background: '#fee2e2', color: '#dc2626', padding: '1px 5px', borderRadius: 4, flexShrink: 0 }}>INACTIVE</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, background: '#eef2ff', color: '#4338ca', padding: '1px 6px', borderRadius: 5 }}>{adm}</span>
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                        {getFormName(student.form_id)} · {getStreamName(student.stream_id)}
                      </span>
                      {student.guardian_phone && (
                        <span style={{ fontSize: 10, color: '#94a3b8' }}>📱 {student.guardian_phone}</span>
                      )}
                    </div>
                    {/* Mini progress bar */}
                    <div style={{ marginTop: 4, height: 3, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden', maxWidth: 120 }}>
                      <div style={{
                        height: '100%', borderRadius: 99,
                        background: annualPct >= 80 ? '#10b981' : annualPct >= 50 ? '#f59e0b' : '#ef4444',
                        width: `${annualPct}%`, transition: 'width 0.5s ease',
                      }} />
                    </div>
                  </div>

                  {/* Fee ring + balance */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FeeRingMini pct={annualPct} size={34} />
                      <span style={{
                        position: 'absolute', fontSize: 7, fontWeight: 900,
                        color: annualPct >= 80 ? '#10b981' : annualPct >= 50 ? '#f59e0b' : '#ef4444',
                      }}>{annualPct}%</span>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 72 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 800,
                        color: isCleared ? '#10b981' : '#ef4444',
                      }}>
                        {isCleared ? '✓ CLEAR' : fmt(fees.termBalance)}
                      </div>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Term Bal</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {displayList.length >= 50 && (
            <div style={{ padding: '8px 16px', borderTop: '1px solid #f1f5f9', background: '#fafbff', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center', margin: 0 }}>Showing first 50 — type to search more precisely</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes dropSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; transform:translateY(-50%) scale(1); }
          50% { opacity:0.4; transform:translateY(-50%) scale(0.8); }
        }
      `}</style>
    </div>
  );
}

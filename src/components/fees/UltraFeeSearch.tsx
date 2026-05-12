'use client';

import { useState, useRef, useEffect } from 'react';
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
}

export default function UltraFeeSearch({ searchFn, onSelect, getFormName, getStreamName, getFeeBalance, selectedStudent }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length >= 1) {
      const found = searchFn(query);
      setResults(found);
      setShowDropdown(found.length > 0);
      setHighlightIndex(-1);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query, searchFn]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSelect = (student: SearchResult) => {
    onSelect(student);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
  };

  const getAdm = (s: SearchResult) => s.admission_no || s.admission_number || '';

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
          onKeyDown={handleKeyDown}
          placeholder="Search by name, admission no, NEMIS, or phone..."
          className="w-full pl-12 pr-4 py-4 bg-white/80 backdrop-blur-xl border-2 border-violet-200/60 rounded-2xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100 outline-none transition-all duration-300 shadow-lg shadow-violet-100/30"
          autoComplete="off"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setShowDropdown(false); setResults([]); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
        {/* Pulse indicator when searching */}
        {query.length > 0 && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
          </div>
        )}
      </div>

      {/* Selected Student Quick Badge */}
      {selectedStudent && !showDropdown && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Selected:</span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-full text-xs font-bold shadow-md">
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">{selectedStudent.first_name?.charAt(0)}</span>
            {selectedStudent.first_name} {selectedStudent.last_name}
            <span className="text-[10px] text-white/70">• {getAdm(selectedStudent)}</span>
          </span>
        </div>
      )}

      {/* Dropdown Results */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-violet-200/50 rounded-2xl shadow-2xl shadow-violet-200/30 z-50 max-h-[420px] overflow-y-auto"
          style={{ animation: 'slideDown 0.2s ease-out' }}
        >
          <div className="px-4 py-2.5 border-b border-gray-100/80 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {results.length} student{results.length !== 1 ? 's' : ''} found
            </span>
            <span className="text-[10px] text-gray-300">↑↓ Navigate • Enter Select</span>
          </div>

          {results.map((student, idx) => {
            const adm = getAdm(student);
            const fees = getFeeBalance(student.id, student.form_id);
            const isHighlighted = idx === highlightIndex;

            return (
              <button
                key={student.id}
                onClick={() => handleSelect(student)}
                onMouseEnter={() => setHighlightIndex(idx)}
                className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-all duration-150 border-b border-gray-50 last:border-0 ${
                  isHighlighted ? 'bg-gradient-to-r from-violet-50 to-indigo-50' : 'hover:bg-gray-50/50'
                }`}
              >
                {/* Avatar */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 shadow-md ${
                  student.gender === 'Female'
                    ? 'bg-gradient-to-br from-pink-400 to-rose-500 text-white'
                    : 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white'
                }`}>
                  {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 text-sm truncate">
                      {student.first_name} {student.other_name || ''} {student.last_name}
                    </span>
                    {student.status === 'Inactive' && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold bg-red-100 text-red-600 rounded">INACTIVE</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-bold font-mono">{adm}</span>
                    <span className="text-[10px] text-gray-500 font-medium">
                      {getFormName(student.form_id)} • {getStreamName(student.stream_id)}
                    </span>
                    {student.guardian_phone && (
                      <span className="text-[10px] text-gray-400">📱 {student.guardian_phone}</span>
                    )}
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right flex-shrink-0">
                  <div className={`text-sm font-extrabold ${fees.termBalance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    {fmt(fees.termBalance)}
                  </div>
                  <div className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">Term Bal</div>
                </div>
              </button>
            );
          })}

          {results.length === 0 && query.length >= 2 && (
            <div className="px-4 py-8 text-center">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm font-medium text-gray-400">No students found</p>
              <p className="text-xs text-gray-300 mt-1">Try a different name, admission number, or phone</p>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

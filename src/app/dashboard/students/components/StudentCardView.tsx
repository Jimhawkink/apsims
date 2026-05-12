'use client';

import Link from 'next/link';
import { FiPhone, FiEye, FiEdit2, FiTrash2, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getEducationSystem } from '@/lib/cbc-utils';
import EducationSystemBadge from '@/components/cbc/EducationSystemBadge';
import PathwayBadge from '@/components/cbc/PathwayBadge';

interface CardViewProps {
    paginated: any[];
    page: number;
    perPage: number;
    totalPages: number;
    filteredCount: number;
    forms: any[];
    cbcPathways: any[];
    cbcStudentSubjects: any[];
    selectedIds: Set<number>;
    toggleSelect: (id: number) => void;
    getFormName: (id: number) => string;
    getStreamName: (id: number) => string;
    getAge: (dob: string) => string;
    getStudentFeeProgress: (studentId: number, formId: number) => number;
    getStudentAttendance: (studentId: number) => number;
    onQuickView: (s: any) => void;
    onEdit: (s: any) => void;
    onDelete: (id: number) => void;
    setPage: (v: number | ((p: number) => number)) => void;
}

export default function StudentCardView({
    paginated, page, perPage, totalPages, filteredCount,
    forms, cbcPathways, cbcStudentSubjects,
    selectedIds, toggleSelect,
    getFormName, getStreamName, getAge,
    getStudentFeeProgress, getStudentAttendance,
    onQuickView, onEdit, onDelete, setPage,
}: CardViewProps) {

    const getProgressColor = (pct: number) => {
        if (pct >= 80) return '#10b981';
        if (pct >= 50) return '#f59e0b';
        return '#ef4444';
    };

    if (filteredCount === 0) {
        return (
            <div className="text-center py-20 text-gray-400 bg-white rounded-2xl border border-gray-100">
                <span className="text-5xl block mb-4">👨‍🎓</span>
                <p className="font-semibold text-lg">No students found</p>
                <p className="text-sm mt-1">Try adjusting your filters or add a new student</p>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginated.map((s) => {
                    const feePct = getStudentFeeProgress(s.id, s.form_id);
                    const attendPct = getStudentAttendance(s.id);
                    const isSelected = selectedIds.has(s.id);

                    return (
                        <div
                            key={s.id}
                            className={`relative rounded-2xl border bg-white overflow-hidden group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 ${isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-100'}`}
                            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
                        >
                            {/* Selection checkbox */}
                            <div className="absolute top-3 left-3 z-10">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(s.id)}
                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />
                            </div>

                            {/* Top accent */}
                            <div
                                className="h-16 relative"
                                style={{
                                    background: s.gender === 'Male'
                                        ? 'linear-gradient(135deg, #3b82f6, #6366f1)'
                                        : 'linear-gradient(135deg, #ec4899, #a855f7)',
                                }}
                            >
                                {/* Status badge top-right */}
                                <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-sm ${
                                    s.status === 'Active' ? 'bg-green-100/90 text-green-700' :
                                    s.status === 'Graduated' ? 'bg-purple-100/90 text-purple-700' :
                                    s.status === 'Transferred' ? 'bg-amber-100/90 text-amber-700' :
                                    'bg-red-100/90 text-red-700'
                                }`}>
                                    {s.status}
                                </span>
                            </div>

                            {/* Avatar */}
                            <div className="flex justify-center -mt-8 relative z-10">
                                <div
                                    className="w-16 h-16 rounded-2xl border-4 border-white flex items-center justify-center text-white font-bold text-lg shadow-lg"
                                    style={{
                                        background: s.gender === 'Male'
                                            ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                                            : 'linear-gradient(135deg, #ec4899, #db2777)',
                                    }}
                                >
                                    {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="px-4 pt-2.5 pb-4 text-center">
                                <h4 className="text-sm font-bold text-gray-800 leading-tight truncate">
                                    {s.first_name} {(s.middle_name || s.other_name || '').charAt(0) ? `${(s.middle_name || s.other_name).charAt(0)}.` : ''} {s.last_name}
                                </h4>

                                {/* Adm No + Curriculum badge */}
                                <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold font-mono">
                                        {s.admission_no || s.admission_number}
                                    </span>
                                    {s.form_id && (() => {
                                        const sys = getEducationSystem(Number(s.form_id), forms);
                                        return sys ? <EducationSystemBadge system={sys} /> : null;
                                    })()}
                                </div>

                                {/* Class + Stream */}
                                <p className="text-xs text-gray-500 mt-1.5">
                                    {getFormName(s.form_id)} • {getStreamName(s.stream_id)}
                                </p>

                                {/* CBC Pathway */}
                                {s.form_id && getEducationSystem(Number(s.form_id), forms) === 'CBC_Senior_School' && (() => {
                                    const studentSubj = cbcStudentSubjects.find((ss: any) => ss.student_id === s.id);
                                    if (!studentSubj) return null;
                                    const pathway = cbcPathways.find((p: any) => p.id === studentSubj.pathway_id);
                                    return pathway ? (
                                        <div className="flex justify-center mt-1.5">
                                            <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} />
                                        </div>
                                    ) : null;
                                })()}

                                {/* Gender + Age */}
                                <div className="flex items-center justify-center gap-3 mt-2.5">
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                        {s.gender === 'Male' ? '♂' : '♀'} {s.gender}
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-medium">{getAge(s.date_of_birth)}</span>
                                </div>

                                {/* Fee + Attendance mini bars */}
                                <div className="mt-3 space-y-2 px-2">
                                    <div>
                                        <div className="flex justify-between mb-0.5">
                                            <span className="text-[9px] font-medium text-gray-400">Fee paid</span>
                                            <span className="text-[9px] font-bold" style={{ color: getProgressColor(feePct) }}>{feePct}%</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-gray-100">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${feePct}%`, background: getProgressColor(feePct) }} />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-0.5">
                                            <span className="text-[9px] font-medium text-gray-400">Attendance</span>
                                            <span className="text-[9px] font-bold" style={{ color: getProgressColor(attendPct) }}>{attendPct}%</span>
                                        </div>
                                        <div className="w-full h-1.5 rounded-full bg-gray-100">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${attendPct}%`, background: getProgressColor(attendPct) }} />
                                        </div>
                                    </div>
                                </div>

                                {/* Guardian */}
                                {s.guardian_name && (
                                    <div className="mt-2.5 pt-2.5 border-t border-gray-100 text-left">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Guardian</p>
                                        <p className="text-xs text-gray-700 font-medium truncate">{s.guardian_name}</p>
                                        {s.guardian_phone && (
                                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <FiPhone size={9} /> {s.guardian_phone}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex items-center justify-center gap-1 mt-3 pt-2.5 border-t border-gray-100 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => onQuickView(s)} className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Quick View">
                                        <FiEye size={14} />
                                    </button>
                                    <button onClick={() => onEdit(s)} className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit">
                                        <FiEdit2 size={14} />
                                    </button>
                                    <button onClick={() => onDelete(s.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                                        <FiTrash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Pagination */}
            <div className="mt-4 bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center justify-between" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <p className="text-xs text-gray-500">
                    Showing <span className="font-bold text-gray-700">{(page - 1) * perPage + 1}</span> to <span className="font-bold text-gray-700">{Math.min(page * perPage, filteredCount)}</span> of <span className="font-bold text-gray-700">{filteredCount}</span>
                </p>
                <div className="flex items-center gap-1">
                    <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">First</button>
                    <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronLeft size={14} /></button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                        const pageNum = start + i;
                        if (pageNum > totalPages) return null;
                        return (
                            <button key={pageNum} onClick={() => setPage(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${page === pageNum ? 'text-white shadow-md' : 'text-gray-500 border border-gray-200 hover:bg-gray-100'}`}
                                style={page === pageNum ? { background: 'linear-gradient(135deg, #3b82f6, #6366f1)' } : {}}>
                                {pageNum}
                            </button>
                        );
                    })}
                    <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronRight size={14} /></button>
                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">Last</button>
                </div>
            </div>
        </div>
    );
}

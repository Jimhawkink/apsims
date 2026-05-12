'use client';

import Link from 'next/link';
import { FiEye, FiEdit2, FiTrash2, FiUsers, FiPhone, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { getEducationSystem } from '@/lib/cbc-utils';
import EducationSystemBadge from '@/components/cbc/EducationSystemBadge';
import PathwayBadge from '@/components/cbc/PathwayBadge';

interface TableViewProps {
    paginated: any[];
    page: number;
    perPage: number;
    totalPages: number;
    filteredCount: number;
    forms: any[];
    streams: any[];
    cbcPathways: any[];
    cbcStudentSubjects: any[];
    selectedIds: Set<number>;
    toggleSelect: (id: number) => void;
    toggleSelectAll: () => void;
    allSelected: boolean;
    getFormName: (id: number) => string;
    getStreamName: (id: number) => string;
    getAge: (dob: string) => string;
    getStudentFeeProgress: (studentId: number, formId: number) => number;
    getStudentAttendance: (studentId: number) => number;
    sortBy: string;
    sortDir: string;
    handleSort: (col: any) => void;
    sortIcon: (col: any) => string;
    onQuickView: (s: any) => void;
    onEdit: (s: any) => void;
    onDelete: (id: number) => void;
    setPage: (v: number | ((p: number) => number)) => void;
}

export default function StudentTableView({
    paginated, page, perPage, totalPages, filteredCount,
    forms, streams, cbcPathways, cbcStudentSubjects,
    selectedIds, toggleSelect, toggleSelectAll, allSelected,
    getFormName, getStreamName, getAge,
    getStudentFeeProgress, getStudentAttendance,
    sortBy, sortDir, handleSort, sortIcon,
    onQuickView, onEdit, onDelete, setPage,
}: TableViewProps) {

    const getProgressColor = (pct: number) => {
        if (pct >= 80) return '#10b981';
        if (pct >= 50) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 6px 24px rgba(0,0,0,0.03)' }}>
            {filteredCount === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <span className="text-5xl block mb-4">👨‍🎓</span>
                    <p className="font-semibold text-lg">No students found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or add a new student</p>
                </div>
            ) : (
                <>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gradient-to-r from-slate-50 to-blue-50/40">
                                    <th className="px-3 py-3 w-10 border-b border-gray-100">
                                        <input
                                            type="checkbox"
                                            checked={allSelected}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100 w-10">#</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100 cursor-pointer hover:text-blue-600" onClick={() => handleSort('name')}>
                                        Student {sortIcon('name')}
                                    </th>
                                    <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100 cursor-pointer hover:text-blue-600" onClick={() => handleSort('adm')}>
                                        Adm No {sortIcon('adm')}
                                    </th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Gender</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Age</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100 cursor-pointer hover:text-blue-600" onClick={() => handleSort('form')}>
                                        Class {sortIcon('form')}
                                    </th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Status</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Guardian</th>
                                    <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Phone</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Fee</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Attend.</th>
                                    <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100 w-28">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.map((s, i) => {
                                    const feePct = getStudentFeeProgress(s.id, s.form_id);
                                    const attendPct = getStudentAttendance(s.id);
                                    const isSelected = selectedIds.has(s.id);

                                    return (
                                        <tr
                                            key={s.id}
                                            className={`border-b border-gray-50 hover:bg-blue-50/30 transition-colors group ${isSelected ? 'bg-blue-50/50' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(s.id)}
                                                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </td>

                                            {/* Row number */}
                                            <td className="px-3 py-2.5 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>

                                            {/* Student name + avatar */}
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                                        style={{ background: s.gender === 'Male' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ec4899, #db2777)' }}
                                                    >
                                                        {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-800 leading-tight">
                                                            {s.first_name} {(s.middle_name || s.other_name || '').charAt(0) ? `${(s.middle_name || s.other_name).charAt(0)}.` : ''} {s.last_name}
                                                        </p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            {s.nemis_no && <span className="text-[9px] text-gray-400">NEMIS: {s.nemis_no}</span>}
                                                            {/* CBC Pathway badge inline */}
                                                            {s.form_id && getEducationSystem(Number(s.form_id), forms) === 'CBC_Senior_School' && (() => {
                                                                const studentSubj = cbcStudentSubjects.find((ss: any) => ss.student_id === s.id);
                                                                if (!studentSubj) return null;
                                                                const pathway = cbcPathways.find((p: any) => p.id === studentSubj.pathway_id);
                                                                return pathway ? <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} /> : null;
                                                            })()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Adm No */}
                                            <td className="px-3 py-2.5">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold font-mono">
                                                    {s.admission_no || s.admission_number}
                                                </span>
                                            </td>

                                            {/* Gender */}
                                            <td className="px-3 py-2.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                                    {s.gender === 'Male' ? '♂' : '♀'} {s.gender}
                                                </span>
                                            </td>

                                            {/* Age */}
                                            <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">{getAge(s.date_of_birth)}</td>

                                            {/* Class + Curriculum */}
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-sm font-semibold text-gray-700">{getFormName(s.form_id)}</span>
                                                    {s.form_id && (() => {
                                                        const sys = getEducationSystem(Number(s.form_id), forms);
                                                        return sys ? <EducationSystemBadge system={sys} /> : null;
                                                    })()}
                                                </div>
                                                <p className="text-[10px] text-gray-400 mt-0.5">{getStreamName(s.stream_id)}</p>
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-2.5 text-center">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                    s.status === 'Active' ? 'bg-green-50 text-green-700' :
                                                    s.status === 'Graduated' ? 'bg-purple-50 text-purple-700' :
                                                    s.status === 'Transferred' ? 'bg-amber-50 text-amber-700' :
                                                    s.status === 'Suspended' ? 'bg-orange-50 text-orange-700' :
                                                    'bg-red-50 text-red-700'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Active' ? 'bg-green-500' : s.status === 'Graduated' ? 'bg-purple-500' : 'bg-red-500'}`} />
                                                    {s.status}
                                                </span>
                                            </td>

                                            {/* Guardian */}
                                            <td className="px-3 py-2.5 text-sm text-gray-600 max-w-[120px] truncate">
                                                {s.guardian_name || <span className="text-gray-300">—</span>}
                                            </td>

                                            {/* Phone */}
                                            <td className="px-3 py-2.5">
                                                {s.guardian_phone ? (
                                                    <span className="flex items-center gap-1 text-xs text-gray-600"><FiPhone size={10} className="text-gray-400" />{s.guardian_phone}</span>
                                                ) : <span className="text-gray-300 text-xs">—</span>}
                                            </td>

                                            {/* Fee Progress Bar */}
                                            <td className="px-3 py-2.5">
                                                <div className="w-16 mx-auto">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[9px] font-bold" style={{ color: getProgressColor(feePct) }}>{feePct}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${feePct}%`, background: getProgressColor(feePct) }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Attendance Progress */}
                                            <td className="px-3 py-2.5">
                                                <div className="w-16 mx-auto">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-[9px] font-bold" style={{ color: getProgressColor(attendPct) }}>{attendPct}%</span>
                                                    </div>
                                                    <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-500"
                                                            style={{ width: `${attendPct}%`, background: getProgressColor(attendPct) }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => onQuickView(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Quick View">
                                                        <FiEye size={14} />
                                                    </button>
                                                    <button onClick={() => onEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit">
                                                        <FiEdit2 size={14} />
                                                    </button>
                                                    <Link href="/dashboard/students/profile" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all" title="Full Profile">
                                                        <FiUsers size={14} />
                                                    </Link>
                                                    <button onClick={() => onDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                                                        <FiTrash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                            Showing <span className="font-bold text-gray-700">{(page - 1) * perPage + 1}</span> to <span className="font-bold text-gray-700">{Math.min(page * perPage, filteredCount)}</span> of <span className="font-bold text-gray-700">{filteredCount}</span>
                        </p>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all">First</button>
                            <button onClick={() => setPage((p: number) => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all"><FiChevronLeft size={14} /></button>
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
                            <button onClick={() => setPage((p: number) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all"><FiChevronRight size={14} /></button>
                            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 transition-all">Last</button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

'use client';

import Link from 'next/link';
import { FiX, FiEdit2, FiEye, FiPhone, FiMail, FiDownload } from 'react-icons/fi';

// ─── Quick View Side Panel ──────────────────────────────────────
interface QuickViewProps {
    student: any;
    getFormName: (id: number) => string;
    getStreamName: (id: number) => string;
    getAge: (dob: string) => string;
    onClose: () => void;
    onEdit: (s: any) => void;
}

export function StudentQuickViewPanel({ student, getFormName, getStreamName, getAge, onClose, onEdit }: QuickViewProps) {
    if (!student) return null;

    const infoRows = [
        { label: 'Gender', value: `${student.gender === 'Male' ? '♂' : '♀'} ${student.gender}` },
        { label: 'DOB / Age', value: student.date_of_birth ? `${new Date(student.date_of_birth).toLocaleDateString('en-GB')} (${getAge(student.date_of_birth)})` : '-' },
        { label: 'Nationality', value: student.nationality || '-' },
        { label: 'County', value: student.county || '-' },
        { label: 'Sub-County', value: student.sub_county || '-' },
        { label: 'Village', value: student.village || '-' },
        { label: 'Religion', value: student.religion || '-' },
        { label: 'KCPE Marks', value: student.kcpe_marks || '-' },
        { label: 'NEMIS / UPI', value: student.nemis_no || '-' },
        { label: 'Birth Cert No', value: student.birth_cert_no || '-' },
        { label: 'Admission Date', value: student.admission_date ? new Date(student.admission_date).toLocaleDateString('en-GB') : '-' },
        { label: 'Previous School', value: student.previous_school || '-' },
        { label: 'Blood Group', value: student.blood_group || '-' },
        { label: 'Medical', value: student.medical_conditions || student.medical_info || 'None' },
        { label: 'Special Needs', value: student.special_needs || 'None' },
    ];

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
            <div
                className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'slideInRight 0.3s ease-out' }}
            >
                {/* Header gradient */}
                <div className="h-28 relative" style={{ background: student.gender === 'Male' ? 'linear-gradient(135deg, #3b82f6, #6366f1)' : 'linear-gradient(135deg, #ec4899, #a855f7)' }}>
                    <button onClick={onClose} className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm text-white/90 hover:bg-white/30 flex items-center justify-center transition-all">
                        <FiX size={18} />
                    </button>
                    {/* Decorative circles */}
                    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
                    <div className="absolute right-12 bottom-2 w-10 h-10 rounded-full bg-white/5" />
                </div>

                <div className="px-5 -mt-12 pb-5">
                    {/* Avatar */}
                    <div
                        className="w-24 h-24 rounded-2xl border-4 border-white flex items-center justify-center text-white font-bold text-3xl shadow-xl mb-3"
                        style={{ background: student.gender === 'Male' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ec4899, #db2777)' }}
                    >
                        {student.first_name?.charAt(0)}{student.last_name?.charAt(0)}
                    </div>

                    {/* Name */}
                    <h2 className="text-xl font-bold text-gray-800">
                        {student.first_name} {student.middle_name || student.other_name || ''} {student.last_name}
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {student.admission_no || student.admission_number} • {getFormName(student.form_id)} {getStreamName(student.stream_id)}
                    </p>

                    {/* Status badge */}
                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${
                        student.status === 'Active' ? 'bg-green-100 text-green-700' :
                        student.status === 'Graduated' ? 'bg-purple-100 text-purple-700' :
                        student.status === 'Transferred' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {student.status}
                    </span>

                    {/* Info rows */}
                    <div className="mt-5 space-y-3">
                        {infoRows.map((item, i) => (
                            <div key={i} className="flex border-b border-gray-100 pb-2">
                                <span className="text-[10px] font-bold text-gray-400 w-28 flex-shrink-0 uppercase tracking-wide pt-0.5">{item.label}</span>
                                <span className="text-sm font-medium text-gray-800">{item.value}</span>
                            </div>
                        ))}

                        {/* Guardian card */}
                        <div className="mt-4 p-4 border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-xl">
                            <p className="text-xs font-bold text-blue-700 mb-2.5 flex items-center gap-1.5">
                                👨‍👩‍👦 Guardian / Parent
                            </p>
                            <div className="space-y-1.5">
                                <p className="text-sm font-semibold text-gray-800">{student.guardian_name || '-'}</p>
                                <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                    <FiPhone size={11} className="text-blue-500" /> {student.guardian_phone || '-'}
                                </p>
                                {student.guardian_email && (
                                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                                        <FiMail size={11} className="text-blue-500" /> {student.guardian_email}
                                    </p>
                                )}
                                <p className="text-[10px] text-gray-400 mt-1">
                                    {student.guardian_relationship || '-'} • ID: {student.guardian_id_no || '-'}
                                    {student.guardian_occupation && ` • ${student.guardian_occupation}`}
                                </p>
                            </div>
                        </div>

                        {/* Emergency contact */}
                        {(student.emergency_contact_name || student.emergency_contact_phone) && (
                            <div className="p-3 border border-red-200 bg-red-50/50 rounded-xl">
                                <p className="text-xs font-bold text-red-700 mb-1.5">🚨 Emergency Contact</p>
                                <p className="text-sm font-medium text-gray-800">{student.emergency_contact_name || '-'}</p>
                                <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                                    <FiPhone size={10} /> {student.emergency_contact_phone || '-'}
                                </p>
                            </div>
                        )}

                        {/* Notes */}
                        {student.notes && (
                            <div className="p-3 border border-gray-200 bg-gray-50 rounded-xl">
                                <p className="text-xs font-bold text-gray-500 mb-1">📝 Notes</p>
                                <p className="text-sm text-gray-700">{student.notes}</p>
                            </div>
                        )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-5 flex gap-2">
                        <button
                            onClick={() => { onClose(); onEdit(student); }}
                            className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}
                        >
                            <FiEdit2 size={14} /> Edit Student
                        </button>
                        <Link
                            href="/dashboard/students/profile"
                            onClick={onClose}
                            className="flex-1 py-2.5 text-sm font-bold text-green-700 bg-green-100 rounded-xl flex items-center justify-center gap-2 hover:bg-green-200 transition-all"
                        >
                            <FiEye size={14} /> Full Profile
                        </Link>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>
    );
}

// ─── Import Modal ───────────────────────────────────────────────
interface ImportModalProps {
    onClose: () => void;
    onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function StudentImportModal({ onClose, onImportFile }: ImportModalProps) {
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'scaleIn 0.2s ease-out' }}
            >
                <div className="p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            📥 Import Students
                        </h3>
                        <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
                            <FiX size={18} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                            <p className="font-semibold mb-1">📋 Required CSV Columns:</p>
                            <p className="text-xs">Adm No, First Name, Last Name, Middle Name, Gender, DOB, Status</p>
                        </div>

                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors group cursor-pointer">
                            <input type="file" accept=".csv,.xlsx" onChange={onImportFile} className="hidden" id="csv-upload" />
                            <label htmlFor="csv-upload" className="cursor-pointer">
                                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">📁</div>
                                <p className="font-semibold text-gray-600">Click to upload CSV file</p>
                                <p className="text-xs text-gray-400 mt-1">Supports .csv format</p>
                            </label>
                        </div>

                        <button
                            onClick={() => {
                                const template = 'Adm No,First Name,Last Name,Middle Name,Gender,DOB,Status\n"001","John","Doe","","Male","2010-01-15","Active"';
                                const blob = new Blob([template], { type: 'text/csv' });
                                const a = document.createElement('a');
                                a.href = URL.createObjectURL(blob);
                                a.download = 'student_import_template.csv';
                                a.click();
                            }}
                            className="w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
                        >
                            <FiDownload size={14} /> Download Template
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}

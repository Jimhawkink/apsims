'use client';

import { FiX, FiSave } from 'react-icons/fi';
import { getEducationSystem } from '@/lib/cbc-utils';
import EducationSystemBadge from '@/components/cbc/EducationSystemBadge';
import CBCEnrollmentStep from '@/components/cbc/CBCEnrollmentStep';
import { KENYAN_COUNTIES, COUNTY_NAMES, NATIONALITIES } from '@/lib/kenyan-data';

interface EnrollModalProps {
    showModal: boolean;
    editId: number | null;
    formData: any;
    setFormData: (v: any) => void;
    modalTab: number;
    setModalTab: (v: number) => void;
    forms: any[];
    streams: any[];
    isCBCForm: boolean;
    cbcPathways: any[];
    cbcPathwaySubjects: any[];
    allSubjects: any[];
    selectedPathwayId: number | null;
    selectedElectives: number[];
    onPathwayChange: (id: number | null) => void;
    onElectivesChange: (ids: number[]) => void;
    onClose: () => void;
    onSave: () => void;
}

export default function StudentEnrollModal({
    showModal, editId, formData, setFormData,
    modalTab, setModalTab, forms, streams, isCBCForm,
    cbcPathways, cbcPathwaySubjects, allSubjects,
    selectedPathwayId, selectedElectives,
    onPathwayChange, onElectivesChange,
    onClose, onSave,
}: EnrollModalProps) {
    if (!showModal) return null;

    const subCounties = formData.county ? KENYAN_COUNTIES[formData.county] || [] : [];
    const modalTabs = isCBCForm
        ? ['📋 Basic Info', '🏠 Location', '👨‍👩‍👦 Guardian', '🏥 Medical', '🎓 Academic', '🛤️ CBC Pathway']
        : ['📋 Basic Info', '🏠 Location', '👨‍👩‍👦 Guardian', '🏥 Medical', '🎓 Academic'];

    const inputClass = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-medium bg-white text-gray-700 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 outline-none transition-all";
    const labelClass = "block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider";

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
                style={{ animation: 'scaleIn 0.2s ease-out' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                    <h3 className="text-lg font-bold text-white">{editId ? '✏️ Edit Student' : '➕ Enroll New Student'}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/20 text-white/90 hover:bg-white/30 flex items-center justify-center transition-all">
                        <FiX size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-6 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
                    {modalTabs.map((t, i) => (
                        <button key={i} onClick={() => setModalTab(i)}
                            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${modalTab === i ? 'text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                            style={modalTab === i ? { background: 'linear-gradient(135deg, #3b82f6, #6366f1)' } : {}}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {/* Tab 0: Basic Info */}
                    {modalTab === 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Admission No *</label><input type="text" value={formData.admission_no} onChange={e => setFormData({ ...formData, admission_no: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>First Name *</label><input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>Middle Name</label><input type="text" value={formData.middle_name} onChange={e => setFormData({ ...formData, middle_name: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>Last Name *</label><input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>Gender *</label><select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className={inputClass}><option value="Male">👦 Male</option><option value="Female">👧 Female</option></select></div>
                            <div><label className={labelClass}>Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className={inputClass} /></div>
                            <div>
                                <label className={labelClass}>Form</label>
                                <select value={formData.form_id || ''} onChange={e => setFormData({ ...formData, form_id: e.target.value ? Number(e.target.value) : null })} className={inputClass}>
                                    <option value="">Select Form</option>
                                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}{f.education_system === 'CBC_Senior_School' ? ' [CBC]' : ' [8-4-4]'}</option>)}
                                </select>
                                {formData.form_id && (() => {
                                    const sys = getEducationSystem(Number(formData.form_id), forms);
                                    return sys ? <div className="mt-1.5 flex items-center gap-1.5"><EducationSystemBadge system={sys} /><span className="text-[10px] text-gray-400">{sys === 'CBC_Senior_School' ? 'CBC pathway required' : '8-4-4 curriculum'}</span></div> : null;
                                })()}
                            </div>
                            <div><label className={labelClass}>Stream</label><select value={formData.stream_id || ''} onChange={e => setFormData({ ...formData, stream_id: e.target.value ? Number(e.target.value) : null })} className={inputClass}><option value="">Select Stream</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                            <div><label className={labelClass}>Admission Date</label><input type="date" value={formData.admission_date} onChange={e => setFormData({ ...formData, admission_date: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={inputClass}><option value="Active">✅ Active</option><option value="Inactive">❌ Inactive</option><option value="Transferred">🔄 Transferred</option><option value="Graduated">🎓 Graduated</option><option value="Suspended">⚠️ Suspended</option></select></div>
                            <div><label className={labelClass}>Religion</label><select value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} className={inputClass}><option value="">Select</option><option value="Christian">Christian</option><option value="Muslim">Muslim</option><option value="Hindu">Hindu</option><option value="Traditional">Traditional</option><option value="Other">Other</option></select></div>
                        </div>
                    )}

                    {/* Tab 1: Location */}
                    {modalTab === 1 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Nationality</label><select value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className={inputClass}>{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                            <div><label className={labelClass}>County</label><select value={formData.county} onChange={e => setFormData({ ...formData, county: e.target.value, sub_county: '' })} className={inputClass}><option value="">Select County</option>{COUNTY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className={labelClass}>Sub-County</label><select value={formData.sub_county} onChange={e => setFormData({ ...formData, sub_county: e.target.value })} className={inputClass} disabled={!formData.county}><option value="">Select Sub-County</option>{subCounties.map((sc: string) => <option key={sc} value={sc}>{sc}</option>)}</select></div>
                            <div><label className={labelClass}>Village / Estate</label><input type="text" value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} className={inputClass} /></div>
                        </div>
                    )}

                    {/* Tab 2: Guardian */}
                    {modalTab === 2 && (
                        <div className="space-y-5">
                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium">👨‍👩‍👦 Primary Guardian / Parent Information</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Guardian Full Name *</label><input type="text" value={formData.guardian_name} onChange={e => setFormData({ ...formData, guardian_name: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Phone Number *</label><input type="tel" value={formData.guardian_phone} onChange={e => setFormData({ ...formData, guardian_phone: e.target.value })} className={inputClass} placeholder="0712345678" /></div>
                                <div><label className={labelClass}>Email</label><input type="email" value={formData.guardian_email} onChange={e => setFormData({ ...formData, guardian_email: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Relationship</label><select value={formData.guardian_relationship} onChange={e => setFormData({ ...formData, guardian_relationship: e.target.value })} className={inputClass}><option value="Parent">Parent</option><option value="Father">Father</option><option value="Mother">Mother</option><option value="Guardian">Guardian</option><option value="Uncle">Uncle</option><option value="Aunt">Aunt</option><option value="Grandparent">Grandparent</option><option value="Sibling">Sibling</option><option value="Other">Other</option></select></div>
                                <div><label className={labelClass}>ID Number</label><input type="text" value={formData.guardian_id_no} onChange={e => setFormData({ ...formData, guardian_id_no: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Occupation</label><input type="text" value={formData.guardian_occupation} onChange={e => setFormData({ ...formData, guardian_occupation: e.target.value })} className={inputClass} /></div>
                            </div>
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">🚨 Emergency Contact</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div><label className={labelClass}>Emergency Contact Name</label><input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })} className={inputClass} /></div>
                                <div><label className={labelClass}>Emergency Phone</label><input type="tel" value={formData.emergency_contact_phone} onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className={inputClass} /></div>
                            </div>
                        </div>
                    )}

                    {/* Tab 3: Medical */}
                    {modalTab === 3 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Blood Group</label><select value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} className={inputClass}><option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                            <div className="sm:col-span-2"><label className={labelClass}>Medical Conditions</label><textarea value={formData.medical_conditions} onChange={e => setFormData({ ...formData, medical_conditions: e.target.value })} className={`${inputClass} min-h-[80px]`} placeholder="e.g. Asthma, allergies..." /></div>
                            <div className="sm:col-span-2"><label className={labelClass}>Special Needs / Disability</label><textarea value={formData.special_needs} onChange={e => setFormData({ ...formData, special_needs: e.target.value })} className={`${inputClass} min-h-[80px]`} /></div>
                        </div>
                    )}

                    {/* Tab 4: Academic */}
                    {modalTab === 4 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Previous School</label><input type="text" value={formData.previous_school} onChange={e => setFormData({ ...formData, previous_school: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>KCPE Marks</label><input type="text" value={formData.kcpe_marks} onChange={e => setFormData({ ...formData, kcpe_marks: e.target.value })} className={inputClass} placeholder="e.g. 350" /></div>
                            <div><label className={labelClass}>Birth Certificate No</label><input type="text" value={formData.birth_cert_no} onChange={e => setFormData({ ...formData, birth_cert_no: e.target.value })} className={inputClass} /></div>
                            <div><label className={labelClass}>NEMIS / UPI Number</label><input type="text" value={formData.nemis_no} onChange={e => setFormData({ ...formData, nemis_no: e.target.value })} className={inputClass} /></div>
                            <div className="sm:col-span-2"><label className={labelClass}>Additional Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className={`${inputClass} min-h-[80px]`} /></div>
                        </div>
                    )}

                    {/* Tab 5: CBC Pathway */}
                    {modalTab === 5 && isCBCForm && (
                        <CBCEnrollmentStep
                            pathways={cbcPathways}
                            pathwaySubjects={cbcPathwaySubjects}
                            allSubjects={allSubjects}
                            selectedPathwayId={selectedPathwayId}
                            selectedElectives={selectedElectives}
                            onPathwayChange={onPathwayChange}
                            onElectivesChange={onElectivesChange}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex gap-2">
                        {modalTab > 0 && (
                            <button onClick={() => setModalTab(modalTab - 1)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
                                ← Previous
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {modalTab < modalTabs.length - 1 ? (
                            <button onClick={() => setModalTab(modalTab + 1)} className="px-6 py-2 text-sm font-bold text-white rounded-xl shadow-md hover:shadow-lg transition-all" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                Next →
                            </button>
                        ) : (
                            <button onClick={onSave} className="px-8 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                                <FiSave size={14} /> {editId ? 'Update Student' : 'Enroll Student'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
        </div>
    );
}

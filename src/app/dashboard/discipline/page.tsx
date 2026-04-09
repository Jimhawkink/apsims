'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
    FiSearch, FiPlus, FiList, FiBarChart2, FiDownload, FiUser, FiX,
    FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiPhone, FiShield
} from 'react-icons/fi';

type DTab = 'record' | 'history' | 'reports' | 'analytics';

const CATEGORIES = [
    'Attendance (Truancy/Lateness)', 'Bullying/Intimidation', 'Fighting/Violence',
    'Disrespect to Staff', 'Substance Abuse', 'Theft/Dishonesty',
    'Academic Dishonesty', 'Property Destruction/Vandalism', 'Sexual Misconduct',
    'Dress Code Violation', 'Mobile Phone Violation', 'Noise/Disruption', 'Other'
];
const SEVERITIES = ['Minor', 'Moderate', 'Major', 'Critical'];
const ACTIONS = [
    'Verbal Warning', 'Written Warning', 'Guidance & Counseling',
    'Parent/Guardian Conference', 'Community Service', 'Detention',
    'Temporary Suspension (1-3 days)', 'Indefinite Suspension', 'Expulsion Recommendation'
];
const STATUSES = ['Open', 'Resolved', 'Under Review', 'Escalated'];
const TERMS = ['Term 1', 'Term 2', 'Term 3'];

export default function DisciplinePage() {
    const [tab, setTab] = useState<DTab>('record');
    const [students, setStudents] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Record form
    const [search, setSearch] = useState('');
    const [selStudent, setSelStudent] = useState<any>(null);
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [severity, setSeverity] = useState('Minor');
    const [description, setDescription] = useState('');
    const [actionTaken, setActionTaken] = useState(ACTIONS[0]);
    const [actionDetails, setActionDetails] = useState('');
    const [teacherId, setTeacherId] = useState('');
    const [parentNotified, setParentNotified] = useState(false);
    const [counseling, setCounseling] = useState(false);
    const [selTerm, setSelTerm] = useState('Term 1');
    const [saving, setSaving] = useState(false);

    // History
    const [hSearch, setHSearch] = useState('');
    const [hStudent, setHStudent] = useState<any>(null);

    // Reports
    const [rForm, setRForm] = useState('');
    const [rStream, setRStream] = useState('');
    const [rCategory, setRCategory] = useState('');
    const [rSeverity, setRSeverity] = useState('');
    const [rDateFrom, setRDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
    const [rDateTo, setRDateTo] = useState(new Date().toISOString().split('T')[0]);

    const currentYear = new Date().getFullYear();

    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [s, t, f, st, d] = await Promise.all([
            supabase.from('school_students').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_teachers').select('*').eq('status', 'Active').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
            supabase.from('school_discipline_records').select('*, school_students(id, first_name, last_name, admission_number, form_id, stream_id, guardian_name, guardian_phone)').order('created_at', { ascending: false }).limit(500),
        ]);
        setStudents(s.data || []); setTeachers(t.data || []);
        setForms(f.data || []); setStreams(st.data || []);
        setRecords(d.data || []); setLoading(false);
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filteredStudents = search.length >= 2 ? students.filter(s =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase())
    ).slice(0, 8) : [];

    const hFilteredStudents = hSearch.length >= 2 ? students.filter(s =>
        `${s.first_name} ${s.last_name} ${s.admission_number || ''}`.toLowerCase().includes(hSearch.toLowerCase())
    ).slice(0, 8) : [];

    const getFormName = (fid: any) => forms.find(f => f.id === fid)?.form_name || '-';
    const getStreamName = (sid: any) => streams.find(s => s.id === sid)?.stream_name || '-';

    const sevColor = (s: string) => s === 'Critical' ? 'bg-red-600 text-white' : s === 'Major' ? 'bg-red-100 text-red-700' : s === 'Moderate' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700';
    const statusColor = (s: string) => s === 'Resolved' ? 'bg-green-100 text-green-700' : s === 'Escalated' ? 'bg-red-100 text-red-700' : s === 'Under Review' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700';

    const handleRecord = async () => {
        if (!selStudent) { toast.error('Select a student'); return; }
        if (!description) { toast.error('Describe the incident'); return; }
        setSaving(true);
        const teacher = teachers.find(t => t.id === Number(teacherId));
        const { error } = await supabase.from('school_discipline_records').insert([{
            student_id: selStudent.id, incident_date: new Date().toISOString().split('T')[0],
            category, severity, description, action_taken: actionTaken,
            action_details: actionDetails || null, reported_by: teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Admin',
            teacher_id: teacherId ? Number(teacherId) : null, parent_notified: parentNotified,
            parent_notified_date: parentNotified ? new Date().toISOString().split('T')[0] : null,
            counseling_referred: counseling, status: 'Open', term: selTerm, year: currentYear, created_by: 'admin'
        }]);
        if (error) { toast.error('Failed: ' + error.message); setSaving(false); return; }
        toast.success('Discipline record saved');
        setSelStudent(null); setSearch(''); setDescription(''); setActionDetails('');
        setParentNotified(false); setCounseling(false);
        fetchAll(); setSaving(false);
    };

    const handleUpdateStatus = async (id: number, status: string) => {
        await supabase.from('school_discipline_records').update({ status }).eq('id', id);
        toast.success(`Status updated to ${status}`);
        fetchAll();
    };

    // History for selected student
    const studentRecords = hStudent ? records.filter(r => r.student_id === hStudent.id) : [];

    // Reports
    const rptRecords = records.filter(r => {
        const d = r.incident_date || r.created_at?.split('T')[0];
        if (d < rDateFrom || d > rDateTo) return false;
        if (rCategory && r.category !== rCategory) return false;
        if (rSeverity && r.severity !== rSeverity) return false;
        const st = r.school_students;
        if (rForm && st?.form_id !== Number(rForm)) return false;
        if (rStream && st?.stream_id !== Number(rStream)) return false;
        return true;
    });

    // Analytics
    const catStats: Record<string, number> = {};
    const sevStats: Record<string, number> = {};
    const formDiscipline: Record<string, number> = {};
    records.filter(r => r.year === currentYear).forEach(r => {
        catStats[r.category] = (catStats[r.category] || 0) + 1;
        sevStats[r.severity] = (sevStats[r.severity] || 0) + 1;
        const fn = getFormName(r.school_students?.form_id);
        formDiscipline[fn] = (formDiscipline[fn] || 0) + 1;
    });
    const topCategories = Object.entries(catStats).sort((a, b) => b[1] - a[1]);
    const maxCat = topCategories.length ? topCategories[0][1] : 1;

    const exportCSV = (data: any[], filename: string) => {
        const headers = ['#','Date','Adm No','Student','Form','Category','Severity','Description','Action','Status','Parent Notified','Counseling'];
        const rows = data.map((r, i) => {
            const st = r.school_students;
            return [i+1, r.incident_date, st?.admission_number||'', st?`${st.first_name} ${st.last_name}`:'', getFormName(st?.form_id), r.category, r.severity, r.description?.replace(/"/g,"'"), r.action_taken, r.status, r.parent_notified?'Yes':'No', r.counseling_referred?'Yes':'No'];
        });
        const csv = [headers.join(','), ...rows.map(r => r.map((c: any) => `"${c}"`).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    };

    const TABS: { key: DTab; label: string; icon: any }[] = [
        { key: 'record', label: 'Record Incident', icon: FiPlus },
        { key: 'history', label: 'Student History', icon: FiUser },
        { key: 'reports', label: 'Discipline Reports', icon: FiList },
        { key: 'analytics', label: 'Analytics', icon: FiBarChart2 },
    ];

    if (loading) return (
        <div className="flex items-center justify-center py-32">
            <div className="text-center">
                <div className="w-10 h-10 border-3 border-gray-200 border-t-rose-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-gray-400 text-sm">Loading Discipline...</p>
            </div>
        </div>
    );

    const yearRecords = records.filter(r => r.year === currentYear);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiShield className="text-rose-500" /> Student Discipline</h1>
                    <p className="text-sm text-gray-500 mt-1">Record, track &amp; analyze student behavioral incidents (Kenya MoE aligned)</p>
                </div>
                <div className="flex items-center gap-2">
                    {SEVERITIES.map(s => (
                        <div key={s} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${sevColor(s)}`}>
                            {sevStats[s] || 0} {s}
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                            tab === t.key ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-rose-300'
                        }`}>
                        <t.icon size={15} /> {t.label}
                    </button>
                ))}
            </div>

            {/* RECORD INCIDENT */}
            {tab === 'record' && (
                <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 text-white">
                        <h3 className="font-bold text-lg flex items-center gap-2"><FiAlertCircle size={18} /> Record Disciplinary Incident</h3>
                        <p className="text-rose-100 text-sm mt-1">Aligned with Kenya MoE guidelines — No corporal punishment</p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Search Student *</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setSelStudent(null); }}
                                placeholder="Admission number or name..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none" />
                        </div>
                        {filteredStudents.length > 0 && !selStudent && (
                            <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-52 overflow-y-auto">
                                {filteredStudents.map(s => (
                                    <button key={s.id} onClick={() => { setSelStudent(s); setSearch(`${s.admission_number} - ${s.first_name} ${s.last_name}`); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-rose-50 border-b border-gray-100 text-sm">
                                        <span className="font-semibold">{s.admission_number}</span> | {s.first_name} {s.last_name} <span className="text-xs text-gray-400 ml-1">{getFormName(s.form_id)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {selStudent && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold">{selStudent.first_name?.charAt(0)}{selStudent.last_name?.charAt(0)}</div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-800">{selStudent.first_name} {selStudent.last_name} <span className="text-xs text-gray-500 ml-1">({selStudent.admission_number})</span></p>
                                <p className="text-xs text-gray-500">{getFormName(selStudent.form_id)} | {getStreamName(selStudent.stream_id)} | Previous incidents: {records.filter(r => r.student_id === selStudent.id).length}</p>
                            </div>
                            <button onClick={() => { setSelStudent(null); setSearch(''); }} className="text-gray-400 hover:text-red-500"><FiX size={16} /></button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Category *</label>
                            <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none">
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Severity *</label>
                            <select value={severity} onChange={e => setSeverity(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none">
                                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Action Taken *</label>
                            <select value={actionTaken} onChange={e => setActionTaken(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none">
                                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Incident Description *</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the incident in detail..."
                            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none h-20 resize-none" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Reported By / Teacher</label>
                            <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none">
                                <option value="">Select Teacher</option>
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Term</label>
                            <select value={selTerm} onChange={e => setSelTerm(e.target.value)} className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none">
                                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={parentNotified} onChange={e => setParentNotified(e.target.checked)} className="w-4 h-4 accent-rose-500" />
                            <FiPhone size={14} className="text-gray-400" /> Parent/Guardian Notified
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={counseling} onChange={e => setCounseling(e.target.checked)} className="w-4 h-4 accent-rose-500" />
                            <FiUser size={14} className="text-gray-400" /> Referred to Guidance &amp; Counseling
                        </label>
                    </div>

                    <button onClick={handleRecord} disabled={saving || !selStudent || !description}
                        className="w-full py-3 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        style={{ background: saving ? '#94a3b8' : 'linear-gradient(135deg, #f43f5e, #ec4899)' }}>
                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> :
                            <><FiCheckCircle size={16} /> Record Incident</>}
                    </button>
                </div>
            )}

            {/* STUDENT HISTORY */}
            {tab === 'history' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl border border-gray-200 p-6">
                        <label className="text-xs font-bold text-gray-500 uppercase block mb-1.5">Search Student</label>
                        <div className="relative">
                            <FiSearch className="absolute left-3 top-3 text-gray-400" size={16} />
                            <input type="text" value={hSearch} onChange={e => { setHSearch(e.target.value); setHStudent(null); }}
                                placeholder="Admission number or name..." className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-rose-400 outline-none" />
                        </div>
                        {hFilteredStudents.length > 0 && !hStudent && (
                            <div className="mt-1 border border-gray-200 rounded-xl overflow-hidden shadow-lg bg-white max-h-52 overflow-y-auto">
                                {hFilteredStudents.map(s => (
                                    <button key={s.id} onClick={() => { setHStudent(s); setHSearch(`${s.admission_number} - ${s.first_name} ${s.last_name}`); }}
                                        className="w-full text-left px-4 py-2.5 hover:bg-rose-50 border-b border-gray-100 text-sm">
                                        <span className="font-semibold">{s.admission_number}</span> | {s.first_name} {s.last_name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {hStudent && (
                        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-rose-50/50 flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-rose-500 text-white flex items-center justify-center text-lg font-bold">{hStudent.first_name?.charAt(0)}{hStudent.last_name?.charAt(0)}</div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{hStudent.first_name} {hStudent.last_name}</h3>
                                    <p className="text-xs text-gray-500">Adm: {hStudent.admission_number} | {getFormName(hStudent.form_id)} | Total incidents: {studentRecords.length}</p>
                                </div>
                            </div>
                            {studentRecords.length === 0 ? (
                                <div className="p-10 text-center text-green-500 font-medium"><FiCheckCircle className="inline mr-1" size={16} /> No disciplinary records — Good behavior!</div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead><tr className="bg-gray-50 border-b">{['#','Date','Category','Severity','Description','Action','Status','Parent'].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                                        <tbody>
                                            {studentRecords.map((r, i) => (
                                                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                                                    <td className="px-3 py-2 text-xs">{new Date(r.incident_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                                                    <td className="px-3 py-2 text-xs font-medium">{r.category}</td>
                                                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sevColor(r.severity)}`}>{r.severity}</span></td>
                                                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{r.description}</td>
                                                    <td className="px-3 py-2 text-xs">{r.action_taken}</td>
                                                    <td className="px-3 py-2">
                                                        <select value={r.status} onChange={e => handleUpdateStatus(r.id, e.target.value)}
                                                            className={`px-2 py-0.5 rounded text-[10px] font-bold border-0 ${statusColor(r.status)}`}>
                                                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs">{r.parent_notified ? <span className="text-green-600 font-bold">Yes</span> : <span className="text-gray-400">No</span>}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* REPORTS */}
            {tab === 'reports' && (
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">From</label>
                                <input type="date" value={rDateFrom} onChange={e => setRDateFrom(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">To</label>
                                <input type="date" value={rDateTo} onChange={e => setRDateTo(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Form</label>
                                <select value={rForm} onChange={e => setRForm(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none">
                                    <option value="">All</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Category</label>
                                <select value={rCategory} onChange={e => setRCategory(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none">
                                    <option value="">All</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Severity</label>
                                <select value={rSeverity} onChange={e => setRSeverity(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none">
                                    <option value="">All</option>{SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button onClick={() => exportCSV(rptRecords, `discipline_report.csv`)} className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-1">
                                    <FiDownload size={14} /> Export
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <h3 className="font-bold text-gray-800">{rptRecords.length} Incident(s)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="bg-gray-50 border-b">{['#','Date','Adm No','Student','Form','Category','Severity','Action','Status'].map(h => <th key={h} className="px-3 py-2.5 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                                <tbody>
                                    {rptRecords.length === 0 ? <tr><td colSpan={9} className="text-center py-10 text-gray-400">No records found</td></tr> :
                                        rptRecords.map((r, i) => {
                                            const st = r.school_students;
                                            return (
                                                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                                                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                                                    <td className="px-3 py-2 text-xs">{new Date(r.incident_date).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</td>
                                                    <td className="px-3 py-2 font-semibold text-blue-600">{st?.admission_number||'-'}</td>
                                                    <td className="px-3 py-2 font-medium">{st?`${st.first_name} ${st.last_name}`:'-'}</td>
                                                    <td className="px-3 py-2 text-xs">{getFormName(st?.form_id)}</td>
                                                    <td className="px-3 py-2 text-xs">{r.category}</td>
                                                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${sevColor(r.severity)}`}>{r.severity}</span></td>
                                                    <td className="px-3 py-2 text-xs">{r.action_taken}</td>
                                                    <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor(r.status)}`}>{r.status}</span></td>
                                                </tr>
                                            );
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ANALYTICS */}
            {tab === 'analytics' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                            <p className="text-2xl font-bold text-gray-700">{yearRecords.length}</p>
                            <p className="text-xs text-gray-500">Total Incidents ({currentYear})</p>
                        </div>
                        {SEVERITIES.map(s => (
                            <div key={s} className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                                <p className={`text-2xl font-bold ${s==='Critical'?'text-red-600':s==='Major'?'text-red-500':s==='Moderate'?'text-amber-600':'text-blue-600'}`}>{sevStats[s]||0}</p>
                                <p className="text-xs text-gray-500">{s}</p>
                            </div>
                        ))}
                    </div>

                    {/* Top Categories */}
                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-800 mb-4">Top Incident Categories ({currentYear})</h3>
                        <div className="space-y-3">
                            {topCategories.map(([cat, count]) => (
                                <div key={cat} className="flex items-center gap-3">
                                    <div className="w-48 text-xs font-medium text-gray-600 truncate">{cat}</div>
                                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500 flex items-center justify-end pr-2"
                                            style={{ width: `${Math.max((count / maxCat) * 100, 8)}%` }}>
                                            <span className="text-[10px] font-bold text-white">{count}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {topCategories.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No data for {currentYear}</p>}
                        </div>
                    </div>

                    {/* By Form */}
                    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-800">Incidents by Form ({currentYear})</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead><tr className="bg-gray-50 border-b">{['Form','Total Incidents','Minor','Moderate','Major','Critical'].map(h => <th key={h} className={`px-4 py-2.5 text-xs font-bold text-gray-500 uppercase ${h!=='Form'?'text-center':'text-left'}`}>{h}</th>)}</tr></thead>
                            <tbody>
                                {forms.map(f => {
                                    const fRecs = yearRecords.filter(r => r.school_students?.form_id === f.id);
                                    return (
                                        <tr key={f.id} className="border-b border-gray-100">
                                            <td className="px-4 py-2.5 font-bold">{f.form_name}</td>
                                            <td className="px-4 py-2.5 text-center font-bold">{fRecs.length}</td>
                                            <td className="px-4 py-2.5 text-center text-blue-600 font-bold">{fRecs.filter(r => r.severity==='Minor').length}</td>
                                            <td className="px-4 py-2.5 text-center text-amber-600 font-bold">{fRecs.filter(r => r.severity==='Moderate').length}</td>
                                            <td className="px-4 py-2.5 text-center text-red-500 font-bold">{fRecs.filter(r => r.severity==='Major').length}</td>
                                            <td className="px-4 py-2.5 text-center text-red-700 font-bold">{fRecs.filter(r => r.severity==='Critical').length}</td>
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
}

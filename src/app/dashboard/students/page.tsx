'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
    FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiSearch, FiDownload, FiUpload,
    FiFilter, FiEye, FiUsers, FiUserPlus, FiUserCheck, FiTrendingUp,
    FiChevronLeft, FiChevronRight, FiMoreVertical, FiPrinter,
    FiCreditCard, FiGrid, FiList, FiPhone, FiMail, FiAward
} from 'react-icons/fi';
import { KENYAN_COUNTIES, COUNTY_NAMES, NATIONALITIES } from '@/lib/kenyan-data';
import { getEducationSystem, validateSubjectCombination } from '@/lib/cbc-utils';
import CBCEnrollmentStep from '@/components/cbc/CBCEnrollmentStep';
import PathwayBadge from '@/components/cbc/PathwayBadge';
import EducationSystemBadge from '@/components/cbc/EducationSystemBadge';

interface Student {
    id?: number; admission_no: string; first_name: string; last_name: string; middle_name: string;
    gender: string; date_of_birth: string; form_id: number | null; stream_id: number | null;
    admission_date: string; status: string;
    nationality: string; county: string; sub_county: string; village: string;
    guardian_name: string; guardian_phone: string; guardian_email: string; guardian_relationship: string; guardian_id_no: string; guardian_occupation: string;
    emergency_contact_name: string; emergency_contact_phone: string;
    blood_group: string; medical_conditions: string; special_needs: string;
    previous_school: string; kcpe_marks: string; birth_cert_no: string; nemis_no: string;
    religion: string; notes: string;
}

const defaultStudent: Student = {
    admission_no: '', first_name: '', last_name: '', middle_name: '', gender: 'Male',
    date_of_birth: '', form_id: null, stream_id: null, admission_date: new Date().toISOString().split('T')[0],
    status: 'Active', nationality: 'Kenyan', county: '', sub_county: '', village: '',
    guardian_name: '', guardian_phone: '', guardian_email: '', guardian_relationship: 'Parent', guardian_id_no: '', guardian_occupation: '',
    emergency_contact_name: '', emergency_contact_phone: '',
    blood_group: '', medical_conditions: '', special_needs: '',
    previous_school: '', kcpe_marks: '', birth_cert_no: '', nemis_no: '',
    religion: '', notes: '',
};

export default function StudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [forms, setForms] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Student>({ ...defaultStudent });
    const [modalTab, setModalTab] = useState(0);
    const [showImport, setShowImport] = useState(false);
    const [showDetailPanel, setShowDetailPanel] = useState<any>(null);
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<'name' | 'adm' | 'form' | 'date'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const perPage = 20;

    // CBC state
    const [cbcPathways, setCbcPathways] = useState<any[]>([]);
    const [cbcPathwaySubjects, setCbcPathwaySubjects] = useState<any[]>([]);
    const [cbcStudentSubjects, setCbcStudentSubjects] = useState<any[]>([]);
    const [selectedPathwayId, setSelectedPathwayId] = useState<number | null>(null);
    const [selectedElectives, setSelectedElectives] = useState<number[]>([]);
    const [allSubjects, setAllSubjects] = useState<any[]>([]);

    const fetchStudents = useCallback(async () => {
        setLoading(true);
        const [s, f, st] = await Promise.all([
            supabase.from('school_students').select('*').order('first_name'),
            supabase.from('school_forms').select('*').order('form_level'),
            supabase.from('school_streams').select('*').order('stream_name'),
        ]);
        setStudents(s.data || []);
        setForms(f.data || []);
        setStreams(st.data || []);

        // Fetch CBC tables (may not exist yet — use try/catch)
        try {
            const [pw, pws, ss, subj] = await Promise.all([
                supabase.from('cbc_pathways').select('*').order('pathway_name'),
                supabase.from('cbc_pathway_subjects').select('*'),
                supabase.from('cbc_student_subjects').select('*'),
                supabase.from('school_subjects').select('*').order('subject_name'),
            ]);
            setCbcPathways(pw.data || []);
            setCbcPathwaySubjects(pws.data || []);
            setCbcStudentSubjects(ss.data || []);
            setAllSubjects(subj.data || []);
        } catch {
            // CBC tables not yet created — silently ignore
        }

        setLoading(false);
    }, []);

    useEffect(() => { fetchStudents(); }, [fetchStudents]);

    const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '-';
    const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '-';

    // Dashboard Stats
    const totalStudents = students.length;
    const activeStudents = students.filter(s => s.status === 'Active').length;
    const maleCount = students.filter(s => s.gender === 'Male' && s.status === 'Active').length;
    const femaleCount = students.filter(s => s.gender === 'Female' && s.status === 'Active').length;
    const graduatedCount = students.filter(s => s.status === 'Graduated').length;
    const transferredCount = students.filter(s => s.status === 'Transferred').length;
    const thisYearAdmissions = students.filter(s => s.admission_date?.startsWith(String(new Date().getFullYear()))).length;
    const formDistribution = forms.map(f => ({ name: f.form_name, count: students.filter(s => s.form_id === f.id && s.status === 'Active').length }));

    const filtered = useMemo(() => {
        let result = students.filter(s => {
            const matchSearch = `${s.first_name} ${s.last_name} ${s.middle_name || ''} ${s.admission_no || s.admission_number || ''}`.toLowerCase().includes(search.toLowerCase());
            const matchForm = !filterForm || String(s.form_id) === filterForm;
            const matchStream = !filterStream || String(s.stream_id) === filterStream;
            const matchStatus = !filterStatus || s.status === filterStatus;
            const matchGender = !filterGender || s.gender === filterGender;
            return matchSearch && matchForm && matchStream && matchStatus && matchGender;
        });

        result.sort((a, b) => {
            let cmp = 0;
            if (sortBy === 'name') cmp = `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
            else if (sortBy === 'adm') cmp = (a.admission_no || a.admission_number || '').localeCompare(b.admission_no || b.admission_number || '');
            else if (sortBy === 'form') cmp = (a.form_id || 0) - (b.form_id || 0);
            else if (sortBy === 'date') cmp = (a.admission_date || '').localeCompare(b.admission_date || '');
            return sortDir === 'desc' ? -cmp : cmp;
        });

        return result;
    }, [students, search, filterForm, filterStream, filterStatus, filterGender, sortBy, sortDir]);

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const getNextAdmNo = () => {
        const year = new Date().getFullYear();
        let max = 0;
        students.forEach(s => {
            const adm = s.admission_no || s.admission_number || '';
            // Match ADM/YYYY/NNN format
            const match = adm.match(/ADM\/\d{4}\/(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (!isNaN(num) && num > max) max = num;
            } else {
                // Legacy plain number format
                const num = parseInt(adm, 10);
                if (!isNaN(num) && num > max) max = num;
            }
        });
        const next = max + 1;
        return `ADM/${year}/${String(next).padStart(3, '0')}`;
    };

    const openAdd = () => { setEditId(null); setFormData({ ...defaultStudent, admission_no: getNextAdmNo() }); setModalTab(0); setSelectedPathwayId(null); setSelectedElectives([]); setShowModal(true); };
    const openEdit = (s: any) => {
        setEditId(s.id);
        setFormData({
            ...defaultStudent, ...s,
            admission_no: s.admission_no || s.admission_number || '',
            middle_name: s.middle_name || s.other_name || '',
            medical_conditions: s.medical_conditions || s.medical_info || '',
            form_id: s.form_id || null, stream_id: s.stream_id || null,
        });
        // Pre-populate CBC pathway/electives if editing a CBC student
        const existingSubjects = cbcStudentSubjects.filter((ss: any) => ss.student_id === s.id);
        if (existingSubjects.length > 0) {
            const pathwayId = existingSubjects[0]?.pathway_id ?? null;
            setSelectedPathwayId(pathwayId);
            const electiveIds = existingSubjects
                .filter((ss: any) => ss.is_elective)
                .map((ss: any) => ss.subject_id as number);
            setSelectedElectives(electiveIds);
        } else {
            setSelectedPathwayId(null);
            setSelectedElectives([]);
        }
        setModalTab(0); setShowModal(true);
    };

    const handleSave = async () => {
        if (!formData.admission_no || !formData.first_name || !formData.last_name) { toast.error('Please fill admission number, first name and last name'); return; }

        // CBC validation: if the selected form is CBC, require pathway + exactly 3 electives
        const isCBC = formData.form_id ? getEducationSystem(Number(formData.form_id), forms) === 'CBC_Senior_School' : false;
        if (isCBC) {
            if (!selectedPathwayId) { toast.error('Please select a CBC pathway before saving'); return; }
            if (!validateSubjectCombination(selectedElectives)) { toast.error('Please select exactly 3 elective subjects for the CBC pathway'); return; }
        }

        const payload: any = {
            admission_number: formData.admission_no, admission_no: formData.admission_no,
            first_name: formData.first_name, last_name: formData.last_name,
            other_name: formData.middle_name || null, middle_name: formData.middle_name || null,
            gender: formData.gender, date_of_birth: formData.date_of_birth || null,
            form_id: formData.form_id ? Number(formData.form_id) : null,
            stream_id: formData.stream_id ? Number(formData.stream_id) : null,
            admission_date: formData.admission_date || null, status: formData.status,
            nationality: formData.nationality || null, county: formData.county || null,
            sub_county: formData.sub_county || null, village: formData.village || null,
            guardian_name: formData.guardian_name || null, guardian_phone: formData.guardian_phone || null,
            guardian_email: formData.guardian_email || null, guardian_relationship: formData.guardian_relationship || null,
            guardian_id_no: formData.guardian_id_no || null, guardian_occupation: formData.guardian_occupation || null,
            emergency_contact_name: formData.emergency_contact_name || null, emergency_contact_phone: formData.emergency_contact_phone || null,
            blood_group: formData.blood_group || null, medical_info: formData.medical_conditions || null,
            medical_conditions: formData.medical_conditions || null, special_needs: formData.special_needs || null,
            previous_school: formData.previous_school || null, kcpe_marks: formData.kcpe_marks ? Number(formData.kcpe_marks) : null,
            birth_cert_no: formData.birth_cert_no || null, nemis_no: formData.nemis_no || null,
            religion: formData.religion || null, notes: formData.notes || null,
        };
        let error;
        let studentId: number | null = editId;
        if (editId) {
            ({ error } = await supabase.from('school_students').update(payload).eq('id', editId));
        } else {
            const { data: inserted, error: insertError } = await supabase.from('school_students').insert([payload]).select('id').single();
            error = insertError;
            if (inserted) studentId = inserted.id;
        }
        if (error) { toast.error(error.message || 'Failed to save'); return; }

        // Upsert CBC subject assignments if this is a CBC student
        if (isCBC && studentId && selectedPathwayId) {
            try {
                // Delete existing subject assignments for this student
                await supabase.from('cbc_student_subjects').delete().eq('student_id', studentId);

                // Compulsory subjects: is_compulsory = true in cbc_pathway_subjects
                const compulsorySubjectIds = cbcPathwaySubjects
                    .filter((ps: any) => ps.is_compulsory)
                    .map((ps: any) => ps.subject_id as number);
                const uniqueCompulsoryIds = [...new Set(compulsorySubjectIds)];

                const compulsoryRows = uniqueCompulsoryIds.map((subjectId) => ({
                    student_id: studentId,
                    pathway_id: selectedPathwayId,
                    subject_id: subjectId,
                    is_elective: false,
                }));

                const electiveRows = selectedElectives.map((subjectId) => ({
                    student_id: studentId,
                    pathway_id: selectedPathwayId,
                    subject_id: subjectId,
                    is_elective: true,
                }));

                if (compulsoryRows.length > 0) {
                    await supabase.from('cbc_student_subjects').insert(compulsoryRows);
                }
                if (electiveRows.length > 0) {
                    await supabase.from('cbc_student_subjects').insert(electiveRows);
                }
            } catch {
                // CBC tables may not exist yet — silently ignore
            }
        }

        toast.success(editId ? 'Student updated ✅' : 'Student enrolled ✅');
        setShowModal(false); fetchStudents();
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this student?')) return;
        const { error } = await supabase.from('school_students').delete().eq('id', id);
        if (error) { toast.error('Cannot delete this student'); return; }
        toast.success('Student removed'); fetchStudents();
    };

    const exportToExcel = () => {
        const headers = ['Adm No', 'First Name', 'Last Name', 'Middle Name', 'Gender', 'DOB', 'Form', 'Stream', 'Status', 'Nationality', 'County', 'Sub-County', 'Village', 'Guardian', 'Guardian Phone', 'Guardian Email', 'KCPE Marks', 'Previous School', 'NEMIS No', 'Birth Cert No', 'Religion', 'Blood Group'];
        const rows = filtered.map(s => [
            s.admission_no || s.admission_number, s.first_name, s.last_name, s.middle_name || '', s.gender,
            s.date_of_birth || '', getFormName(s.form_id), getStreamName(s.stream_id), s.status,
            s.nationality || '', s.county || '', s.sub_county || '', s.village || '',
            s.guardian_name || '', s.guardian_phone || '', s.guardian_email || '',
            s.kcpe_marks || '', s.previous_school || '', s.nemis_no || '', s.birth_cert_no || '',
            s.religion || '', s.blood_group || '',
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `APSIMS_Students_${new Date().toISOString().split('T')[0]}.csv`; a.click();
        URL.revokeObjectURL(url); toast.success('Students exported ✅');
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { toast.error('Invalid file or no data rows'); return; }
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
            const admIdx = headers.indexOf('adm no'); const fnIdx = headers.indexOf('first name'); const lnIdx = headers.indexOf('last name');
            if (admIdx === -1 || fnIdx === -1 || lnIdx === -1) { toast.error('CSV must have columns: Adm No, First Name, Last Name'); return; }
            let imported = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                if (!cols[admIdx] || !cols[fnIdx] || !cols[lnIdx]) continue;
                const genderIdx = headers.indexOf('gender');
                const payload: any = {
                    admission_number: cols[admIdx], admission_no: cols[admIdx],
                    first_name: cols[fnIdx], last_name: cols[lnIdx],
                    other_name: cols[headers.indexOf('middle name')] || '', middle_name: cols[headers.indexOf('middle name')] || '',
                    gender: genderIdx >= 0 ? cols[genderIdx] : 'Male', status: 'Active',
                };
                const { error } = await supabase.from('school_students').insert([payload]);
                if (!error) imported++;
            }
            toast.success(`${imported} students imported ✅`);
            setShowImport(false); fetchStudents();
        };
        reader.readAsText(file);
    };

    const subCounties = formData.county ? KENYAN_COUNTIES[formData.county] || [] : [];
    const isCBCForm = formData.form_id ? getEducationSystem(Number(formData.form_id), forms) === 'CBC_Senior_School' : false;
    const modalTabs = isCBCForm
        ? ['📋 Basic Info', '🏠 Location', '👨‍👩‍👦 Guardian', '🏥 Medical', '🎓 Academic', '🛤️ CBC Pathway']
        : ['📋 Basic Info', '🏠 Location', '👨‍👩‍👦 Guardian', '🏥 Medical', '🎓 Academic'];

    const handleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };
    const sortIcon = (col: typeof sortBy) => sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '';

    const getAge = (dob: string) => {
        if (!dob) return '-';
        const diff = Date.now() - new Date(dob).getTime();
        return `${Math.floor(diff / 31557600000)}y`;
    };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* ==================== DASHBOARD HEADER ==================== */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}><FiUsers size={18} /></div>
                        Student Information System
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Comprehensive student management — enrollment, profiles, academics & reporting</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowImport(true)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 hover:shadow-sm transition-all"><FiUpload size={14} /> Import</button>
                    <button onClick={exportToExcel} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 hover:shadow-sm transition-all"><FiDownload size={14} /> Export</button>
                    <button onClick={openAdd} className="px-5 py-2 text-sm font-bold text-white rounded-xl flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}><FiPlus size={16} /> Enroll Student</button>
                </div>
            </div>

            {/* ==================== STATS DASHBOARD ==================== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                    { label: 'Total Students', value: totalStudents, icon: FiUsers, gradient: 'linear-gradient(135deg, #3b82f6, #2563eb)', sub: 'All records' },
                    { label: 'Active', value: activeStudents, icon: FiUserCheck, gradient: 'linear-gradient(135deg, #10b981, #059669)', sub: 'Currently enrolled' },
                    { label: 'Male', value: maleCount, icon: FiUsers, gradient: 'linear-gradient(135deg, #3b82f6, #6366f1)', sub: `${activeStudents > 0 ? ((maleCount / activeStudents) * 100).toFixed(0) : 0}%` },
                    { label: 'Female', value: femaleCount, icon: FiUsers, gradient: 'linear-gradient(135deg, #ec4899, #db2777)', sub: `${activeStudents > 0 ? ((femaleCount / activeStudents) * 100).toFixed(0) : 0}%` },
                    { label: 'Graduated', value: graduatedCount, icon: FiAward, gradient: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', sub: 'Alumni' },
                    { label: 'Transferred', value: transferredCount, icon: FiTrendingUp, gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', sub: 'Left school' },
                    { label: 'New This Year', value: thisYearAdmissions, icon: FiUserPlus, gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', sub: String(new Date().getFullYear()) },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className="rounded-2xl p-3.5 text-white relative overflow-hidden" style={{ background: s.gradient }}>
                            <Icon size={28} className="absolute right-2 top-2 opacity-15" />
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{s.label}</p>
                            <p className="text-xl font-extrabold mt-1">{s.value}</p>
                            <p className="text-[10px] opacity-70 mt-0.5">{s.sub}</p>
                        </div>
                    );
                })}
            </div>

            {/* ==================== FORM DISTRIBUTION BAR ==================== */}
            {formDistribution.some(f => f.count > 0) && (
                <div className="bg-white rounded-2xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Class Distribution</p>
                        <div className="flex gap-3">
                            {formDistribution.map((f, i) => {
                                const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                                return (
                                    <span key={i} className="flex items-center gap-1.5 text-xs">
                                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colors[i % colors.length] }} />
                                        <span className="font-semibold text-gray-600">{f.name}</span>
                                        <span className="text-gray-400">({f.count})</span>
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                    <div className="flex rounded-xl overflow-hidden h-4">
                        {formDistribution.filter(f => f.count > 0).map((f, i) => {
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                            return (
                                <div key={i} className="flex items-center justify-center text-white text-[10px] font-bold transition-all hover:opacity-80 cursor-default"
                                    style={{ width: `${activeStudents > 0 ? (f.count / activeStudents) * 100 : 0}%`, background: colors[i % colors.length], minWidth: f.count > 0 ? '30px' : '0' }}
                                    title={`${f.name}: ${f.count} students`}>
                                    {f.count}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ==================== QUICK LINKS ==================== */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { href: '/dashboard/students/profile', label: 'Student Profiles', icon: FiEye, desc: 'Detailed view', color: '#3b82f6', bg: '#eff6ff' },
                    { href: '/dashboard/students/admissions', label: 'Admissions', icon: FiUserPlus, desc: 'Enrollment stats', color: '#10b981', bg: '#ecfdf5' },
                    { href: '/dashboard/students/promotion', label: 'Promotion', icon: FiTrendingUp, desc: 'Class promotion', color: '#8b5cf6', bg: '#f5f3ff' },
                    { href: '/dashboard/students/id-cards', label: 'ID Cards', icon: FiCreditCard, desc: 'Generate cards', color: '#f59e0b', bg: '#fffbeb' },
                ].map((link, i) => {
                    const Icon = link.icon;
                    return (
                        <Link key={i} href={link.href} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: link.bg }}><Icon size={18} style={{ color: link.color }} /></div>
                            <p className="text-sm font-bold text-gray-800 group-hover:text-blue-700">{link.label}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{link.desc}</p>
                        </Link>
                    );
                })}
            </div>

            {/* ==================== FILTERS ==================== */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative flex-1 min-w-[200px] max-w-md">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name, admission number..."
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-400 outline-none transition-all" />
                    </div>
                    <select value={filterForm} onChange={e => { setFilterForm(e.target.value); setPage(1); }} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none min-w-[120px]">
                        <option value="">All Forms</option>
                        {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                    </select>
                    <select value={filterStream} onChange={e => { setFilterStream(e.target.value); setPage(1); }} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none min-w-[120px]">
                        <option value="">All Streams</option>
                        {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
                    </select>
                    <select value={filterGender} onChange={e => { setFilterGender(e.target.value); setPage(1); }} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none min-w-[100px]">
                        <option value="">All Genders</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                    </select>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-blue-400 outline-none min-w-[120px]">
                        <option value="">All Statuses</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Transferred">Transferred</option>
                        <option value="Graduated">Graduated</option>
                        <option value="Suspended">Suspended</option>
                    </select>
                    {(search || filterForm || filterStream || filterStatus || filterGender) && (
                        <button onClick={() => { setSearch(''); setFilterForm(''); setFilterStream(''); setFilterStatus(''); setFilterGender(''); setPage(1); }}
                            className="px-3 py-2.5 text-xs font-bold text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-all flex items-center gap-1">
                            <FiX size={12} /> Clear
                        </button>
                    )}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400"><span className="font-bold text-gray-600">{filtered.length}</span> students found</p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>Sort by:</span>
                        {[
                            { key: 'name' as const, label: 'Name' },
                            { key: 'adm' as const, label: 'Adm No' },
                            { key: 'form' as const, label: 'Form' },
                            { key: 'date' as const, label: 'Adm Date' },
                        ].map(s => (
                            <button key={s.key} onClick={() => handleSort(s.key)}
                                className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${sortBy === s.key ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                                {s.label} {sortIcon(s.key)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ==================== DATA GRID ==================== */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    {filtered.length === 0 ? (
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
                                        <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-10">#</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Student</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Adm No</th>
                                            <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Gender</th>
                                            <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Age</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Class</th>
                                            <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Status</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Guardian</th>
                                            <th className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200">Contact</th>
                                            <th className="px-3 py-3 text-center text-[10px] font-bold text-gray-500 uppercase border-b-2 border-gray-200 w-32">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginated.map((s, i) => (
                                            <tr key={s.id} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-3 py-2.5 text-xs text-gray-400">{(page - 1) * perPage + i + 1}</td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                                                            style={{ background: s.gender === 'Male' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                                                            {s.first_name?.charAt(0)}{s.last_name?.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-800 leading-tight">{s.first_name} {s.middle_name || s.other_name ? (s.middle_name || s.other_name).charAt(0) + '.' : ''} {s.last_name}</p>
                                                            {s.nemis_no && <p className="text-[10px] text-gray-400 mt-0.5">NEMIS: {s.nemis_no}</p>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold font-mono">{s.admission_no || s.admission_number}</span></td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                                                        {s.gender === 'Male' ? '♂' : '♀'} {s.gender}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-500">{getAge(s.date_of_birth)}</td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <p className="text-sm font-semibold text-gray-700">{getFormName(s.form_id)}</p>
                                                        {s.form_id && (() => {
                                                            const sys = getEducationSystem(Number(s.form_id), forms);
                                                            return sys ? <EducationSystemBadge system={sys} /> : null;
                                                        })()}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                        <p className="text-[10px] text-gray-400">{getStreamName(s.stream_id)}</p>
                                                        {s.form_id && getEducationSystem(Number(s.form_id), forms) === 'CBC_Senior_School' && (() => {
                                                            const studentSubj = cbcStudentSubjects.find((ss: any) => ss.student_id === s.id);
                                                            if (!studentSubj) return null;
                                                            const pathway = cbcPathways.find((p: any) => p.id === studentSubj.pathway_id);
                                                            return pathway ? <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} /> : null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2.5 text-center">
                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                        s.status === 'Active' ? 'bg-green-50 text-green-700' :
                                                        s.status === 'Graduated' ? 'bg-purple-50 text-purple-700' :
                                                        s.status === 'Transferred' ? 'bg-amber-50 text-amber-700' :
                                                        s.status === 'Suspended' ? 'bg-orange-50 text-orange-700' :
                                                        'bg-red-50 text-red-700'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${s.status === 'Active' ? 'bg-green-500' : s.status === 'Graduated' ? 'bg-purple-500' : 'bg-red-500'}`} />
                                                        {s.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-sm text-gray-600 max-w-[120px] truncate">{s.guardian_name || <span className="text-gray-300">—</span>}</td>
                                                <td className="px-3 py-2.5">
                                                    {s.guardian_phone ? (
                                                        <span className="flex items-center gap-1 text-xs text-gray-600"><FiPhone size={10} className="text-gray-400" />{s.guardian_phone}</span>
                                                    ) : <span className="text-gray-300 text-xs">—</span>}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <div className="flex items-center justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => setShowDetailPanel(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all" title="Quick View">
                                                            <FiEye size={14} />
                                                        </button>
                                                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all" title="Edit">
                                                            <FiEdit2 size={14} />
                                                        </button>
                                                        <Link href="/dashboard/students/profile" className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all" title="Full Profile">
                                                            <FiUsers size={14} />
                                                        </Link>
                                                        <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all" title="Delete">
                                                            <FiTrash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                                <p className="text-xs text-gray-500">
                                    Showing <span className="font-bold text-gray-700">{(page - 1) * perPage + 1}</span> to <span className="font-bold text-gray-700">{Math.min(page * perPage, filtered.length)}</span> of <span className="font-bold text-gray-700">{filtered.length}</span>
                                </p>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setPage(1)} disabled={page === 1} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">First</button>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronLeft size={14} /></button>
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
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><FiChevronRight size={14} /></button>
                                    <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30">Last</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ==================== QUICK VIEW PANEL ==================== */}
            {showDetailPanel && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowDetailPanel(null)}>
                    <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-slide-in-right" onClick={e => e.stopPropagation()}>
                        {/* Panel Header */}
                        <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                            <button onClick={() => setShowDetailPanel(null)} className="absolute right-3 top-3 text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>
                        <div className="px-5 -mt-10 pb-5">
                            <div className="w-20 h-20 rounded-2xl border-4 border-white flex items-center justify-center text-white font-bold text-2xl shadow-lg mb-3"
                                style={{ background: showDetailPanel.gender === 'Male' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ec4899, #db2777)' }}>
                                {showDetailPanel.first_name?.charAt(0)}{showDetailPanel.last_name?.charAt(0)}
                            </div>
                            <h2 className="text-xl font-bold text-gray-800">{showDetailPanel.first_name} {showDetailPanel.middle_name || showDetailPanel.other_name || ''} {showDetailPanel.last_name}</h2>
                            <p className="text-sm text-gray-500 mt-0.5">{showDetailPanel.admission_no || showDetailPanel.admission_number} • {getFormName(showDetailPanel.form_id)} {getStreamName(showDetailPanel.stream_id)}</p>
                            <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-bold ${showDetailPanel.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{showDetailPanel.status}</span>

                            <div className="mt-5 space-y-3">
                                {[
                                    { label: 'Gender', value: `${showDetailPanel.gender === 'Male' ? '♂' : '♀'} ${showDetailPanel.gender}` },
                                    { label: 'DOB / Age', value: showDetailPanel.date_of_birth ? `${new Date(showDetailPanel.date_of_birth).toLocaleDateString('en-GB')} (${getAge(showDetailPanel.date_of_birth)})` : '-' },
                                    { label: 'Nationality', value: showDetailPanel.nationality || '-' },
                                    { label: 'County', value: showDetailPanel.county || '-' },
                                    { label: 'Religion', value: showDetailPanel.religion || '-' },
                                    { label: 'KCPE Marks', value: showDetailPanel.kcpe_marks || '-' },
                                    { label: 'NEMIS / UPI', value: showDetailPanel.nemis_no || '-' },
                                    { label: 'Birth Cert No', value: showDetailPanel.birth_cert_no || '-' },
                                    { label: 'Admission Date', value: showDetailPanel.admission_date ? new Date(showDetailPanel.admission_date).toLocaleDateString('en-GB') : '-' },
                                    { label: 'Previous School', value: showDetailPanel.previous_school || '-' },
                                    { label: 'Blood Group', value: showDetailPanel.blood_group || '-' },
                                    { label: 'Medical', value: showDetailPanel.medical_conditions || showDetailPanel.medical_info || 'None' },
                                    { label: 'Special Needs', value: showDetailPanel.special_needs || 'None' },
                                ].map((item, i) => (
                                    <div key={i} className="flex border-b border-gray-100 pb-2">
                                        <span className="text-[10px] font-bold text-gray-400 w-28 flex-shrink-0 uppercase tracking-wide pt-0.5">{item.label}</span>
                                        <span className="text-sm font-medium text-gray-800">{item.value}</span>
                                    </div>
                                ))}

                                <div className="mt-4 p-3 border border-blue-200 bg-blue-50 rounded-xl">
                                    <p className="text-xs font-bold text-blue-700 mb-2">👨‍👩‍👦 Guardian</p>
                                    <div className="space-y-1.5">
                                        <p className="text-sm font-semibold text-gray-800">{showDetailPanel.guardian_name || '-'}</p>
                                        <p className="text-xs text-gray-600 flex items-center gap-1"><FiPhone size={10} /> {showDetailPanel.guardian_phone || '-'}</p>
                                        {showDetailPanel.guardian_email && <p className="text-xs text-gray-600 flex items-center gap-1"><FiMail size={10} /> {showDetailPanel.guardian_email}</p>}
                                        <p className="text-[10px] text-gray-400">Relationship: {showDetailPanel.guardian_relationship || '-'} • ID: {showDetailPanel.guardian_id_no || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 flex gap-2">
                                <button onClick={() => { setShowDetailPanel(null); openEdit(showDetailPanel); }} className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}><FiEdit2 size={14} /> Edit Student</button>
                                <Link href="/dashboard/students/profile" onClick={() => setShowDetailPanel(null)} className="flex-1 py-2.5 text-sm font-bold text-green-700 bg-green-100 rounded-xl flex items-center justify-center gap-2 hover:bg-green-200"><FiEye size={14} /> Full Profile</Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== IMPORT MODAL ==================== */}
            {showImport && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold text-gray-800">📥 Import Students from CSV</h3>
                            <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600"><FiX size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-700">
                                <p className="font-semibold mb-1">📋 Required CSV Columns:</p>
                                <p className="text-xs">Adm No, First Name, Last Name, Middle Name, Gender, DOB, Status</p>
                            </div>
                            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-blue-400 transition-colors">
                                <input type="file" accept=".csv,.xlsx" onChange={handleImportFile} className="hidden" id="csv-upload" />
                                <label htmlFor="csv-upload" className="cursor-pointer"><div className="text-4xl mb-3">📁</div><p className="font-semibold text-gray-600">Click to upload CSV file</p><p className="text-xs text-gray-400 mt-1">Supports .csv format</p></label>
                            </div>
                            <button onClick={() => {
                                const template = 'Adm No,First Name,Last Name,Middle Name,Gender,DOB,Status\n"001","John","Doe","","Male","2010-01-15","Active"';
                                const blob = new Blob([template], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'student_import_template.csv'; a.click();
                            }} className="w-full py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200"><FiDownload size={14} /> Download Template</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== ADD/EDIT STUDENT MODAL ==================== */}
            {showModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
                            <h3 className="text-lg font-bold text-white">{editId ? '✏️ Edit Student' : '➕ Enroll New Student'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-white/80 hover:text-white"><FiX size={20} /></button>
                        </div>

                        <div className="flex gap-1 px-6 py-3 bg-gray-50 border-b border-gray-200 overflow-x-auto">
                            {modalTabs.map((t, i) => (
                                <button key={i} onClick={() => setModalTab(i)}
                                    className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${modalTab === i ? 'text-white shadow-md' : 'text-gray-500 hover:bg-gray-100'}`}
                                    style={modalTab === i ? { background: 'linear-gradient(135deg, #3b82f6, #6366f1)' } : {}}>{t}</button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {modalTab === 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Admission No *</label><input type="text" value={formData.admission_no} onChange={e => setFormData({ ...formData, admission_no: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">First Name *</label><input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Middle Name</label><input type="text" value={formData.middle_name} onChange={e => setFormData({ ...formData, middle_name: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Last Name *</label><input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Gender *</label><select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="Male">👦 Male</option><option value="Female">👧 Female</option></select></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Date of Birth</label><input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Form</label><select value={formData.form_id || ''} onChange={e => setFormData({ ...formData, form_id: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}{f.education_system === 'CBC_Senior_School' ? ' [CBC]' : ' [8-4-4]'}</option>)}</select>{formData.form_id && (() => { const sys = getEducationSystem(Number(formData.form_id), forms); return sys ? <div className="mt-1.5 flex items-center gap-1.5"><EducationSystemBadge system={sys} /><span className="text-[10px] text-gray-400">{sys === 'CBC_Senior_School' ? 'CBC Senior School pathway required' : '8-4-4 curriculum'}</span></div> : null; })()}</div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Stream</label><select value={formData.stream_id || ''} onChange={e => setFormData({ ...formData, stream_id: e.target.value ? Number(e.target.value) : null })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="">Select Stream</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</select></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Admission Date</label><input type="date" value={formData.admission_date} onChange={e => setFormData({ ...formData, admission_date: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Status</label><select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="Active">✅ Active</option><option value="Inactive">❌ Inactive</option><option value="Transferred">🔄 Transferred</option><option value="Graduated">🎓 Graduated</option><option value="Suspended">⚠️ Suspended</option></select></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Religion</label><select value={formData.religion} onChange={e => setFormData({ ...formData, religion: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="">Select</option><option value="Christian">Christian</option><option value="Muslim">Muslim</option><option value="Hindu">Hindu</option><option value="Traditional">Traditional</option><option value="Other">Other</option></select></div>
                                </div>
                            )}
                            {modalTab === 1 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Nationality</label><select value={formData.nationality} onChange={e => setFormData({ ...formData, nationality: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none">{NATIONALITIES.map(n => <option key={n} value={n}>{n}</option>)}</select></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">County</label><select value={formData.county} onChange={e => setFormData({ ...formData, county: e.target.value, sub_county: '' })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="">Select County</option>{COUNTY_NAMES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Sub-County</label><select value={formData.sub_county} onChange={e => setFormData({ ...formData, sub_county: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" disabled={!formData.county}><option value="">Select Sub-County</option>{subCounties.map(sc => <option key={sc} value={sc}>{sc}</option>)}</select></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Village / Estate</label><input type="text" value={formData.village} onChange={e => setFormData({ ...formData, village: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                </div>
                            )}
                            {modalTab === 2 && (
                                <div className="space-y-5">
                                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 font-medium">👨‍👩‍👦 Primary Guardian / Parent Information</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Guardian Full Name *</label><input type="text" value={formData.guardian_name} onChange={e => setFormData({ ...formData, guardian_name: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Phone Number *</label><input type="tel" value={formData.guardian_phone} onChange={e => setFormData({ ...formData, guardian_phone: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" placeholder="0712345678" /></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Email</label><input type="email" value={formData.guardian_email} onChange={e => setFormData({ ...formData, guardian_email: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Relationship</label><select value={formData.guardian_relationship} onChange={e => setFormData({ ...formData, guardian_relationship: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="Parent">Parent</option><option value="Father">Father</option><option value="Mother">Mother</option><option value="Guardian">Guardian</option><option value="Uncle">Uncle</option><option value="Aunt">Aunt</option><option value="Grandparent">Grandparent</option><option value="Sibling">Sibling</option><option value="Other">Other</option></select></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">ID Number</label><input type="text" value={formData.guardian_id_no} onChange={e => setFormData({ ...formData, guardian_id_no: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Occupation</label><input type="text" value={formData.guardian_occupation} onChange={e => setFormData({ ...formData, guardian_occupation: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 font-medium">🚨 Emergency Contact</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Emergency Contact Name</label><input type="text" value={formData.emergency_contact_name} onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                        <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Emergency Phone</label><input type="tel" value={formData.emergency_contact_phone} onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    </div>
                                </div>
                            )}
                            {modalTab === 3 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Blood Group</label><select value={formData.blood_group} onChange={e => setFormData({ ...formData, blood_group: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none"><option value="">Select</option>{['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                                    <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Medical Conditions</label><textarea value={formData.medical_conditions} onChange={e => setFormData({ ...formData, medical_conditions: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none min-h-[80px]" placeholder="e.g. Asthma, allergies..." /></div>
                                    <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Special Needs / Disability</label><textarea value={formData.special_needs} onChange={e => setFormData({ ...formData, special_needs: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none min-h-[80px]" /></div>
                                </div>
                            )}
                            {modalTab === 4 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Previous School</label><input type="text" value={formData.previous_school} onChange={e => setFormData({ ...formData, previous_school: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">KCPE Marks</label><input type="text" value={formData.kcpe_marks} onChange={e => setFormData({ ...formData, kcpe_marks: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" placeholder="e.g. 350" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Birth Certificate No</label><input type="text" value={formData.birth_cert_no} onChange={e => setFormData({ ...formData, birth_cert_no: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">NEMIS / UPI Number</label><input type="text" value={formData.nemis_no} onChange={e => setFormData({ ...formData, nemis_no: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none" /></div>
                                    <div className="sm:col-span-2"><label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase">Additional Notes</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-medium focus:border-blue-400 outline-none min-h-[80px]" /></div>
                                </div>
                            )}
                            {modalTab === 5 && isCBCForm && (
                                <CBCEnrollmentStep
                                    pathways={cbcPathways}
                                    pathwaySubjects={cbcPathwaySubjects}
                                    allSubjects={allSubjects}
                                    selectedPathwayId={selectedPathwayId}
                                    selectedElectives={selectedElectives}
                                    onPathwayChange={(id) => { setSelectedPathwayId(id); setSelectedElectives([]); }}
                                    onElectivesChange={setSelectedElectives}
                                />
                            )}
                        </div>

                        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex gap-2">{modalTab > 0 && <button onClick={() => setModalTab(modalTab - 1)} className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-100">← Previous</button>}</div>
                            <div className="flex gap-2">
                                {modalTab < modalTabs.length - 1 ? (
                                    <button onClick={() => setModalTab(modalTab + 1)} className="px-6 py-2 text-sm font-bold text-white rounded-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>Next →</button>
                                ) : (
                                    <button onClick={handleSave} className="px-8 py-2 text-sm font-bold text-white rounded-lg flex items-center gap-2 shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}><FiSave size={14} /> {editId ? 'Update Student' : 'Enroll Student'}</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiUpload, FiDownload, FiUsers, FiGrid, FiList, FiPrinter } from 'react-icons/fi';
import { getEducationSystem, validateSubjectCombination } from '@/lib/cbc-utils';
import { useStudentData } from './useStudentData';
import StudentKPIStrip from './components/StudentKPIStrip';
import StudentClassDistribution from './components/StudentClassDistribution';
import StudentModuleShortcuts from './components/StudentModuleShortcuts';
import { StudentFilterBar, BulkActionBar } from './components/StudentFilterBar';
import StudentTableView from './components/StudentTableView';
import StudentCardView from './components/StudentCardView';
import { StudentQuickViewPanel, StudentImportModal } from './components/StudentModals';
import StudentEnrollModal from './components/StudentEnrollModal';

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
    const data = useStudentData();
    const { students, forms, streams, loading, fetchStudents, cbcPathways, cbcPathwaySubjects, cbcStudentSubjects, allSubjects, getFormName, getStreamName } = data;

    // UI State
    const [search, setSearch] = useState('');
    const [filterForm, setFilterForm] = useState('');
    const [filterStream, setFilterStream] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterGender, setFilterGender] = useState('');
    const [filterCurriculum, setFilterCurriculum] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
    const [page, setPage] = useState(1);
    const [sortBy, setSortBy] = useState<'name' | 'adm' | 'form' | 'date'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const perPage = 20;

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [formData, setFormData] = useState<Student>({ ...defaultStudent });
    const [modalTab, setModalTab] = useState(0);
    const [showImport, setShowImport] = useState(false);
    const [showDetailPanel, setShowDetailPanel] = useState<any>(null);
    const [selectedPathwayId, setSelectedPathwayId] = useState<number | null>(null);
    const [selectedElectives, setSelectedElectives] = useState<number[]>([]);

    // Filtering + Sorting
    const filtered = useMemo(() => {
        let result = students.filter(s => {
            const searchStr = `${s.first_name} ${s.last_name} ${s.middle_name || ''} ${s.admission_no || s.admission_number || ''} ${s.guardian_name || ''} ${s.nemis_no || ''}`.toLowerCase();
            const matchSearch = searchStr.includes(search.toLowerCase());
            const matchForm = !filterForm || String(s.form_id) === filterForm;
            const matchStream = !filterStream || String(s.stream_id) === filterStream;
            const matchStatus = !filterStatus || s.status === filterStatus;
            const matchGender = !filterGender || s.gender === filterGender;
            let matchCurr = true;
            if (filterCurriculum && s.form_id) {
                const sys = getEducationSystem(Number(s.form_id), forms);
                matchCurr = filterCurriculum === 'CBC' ? sys === 'CBC_Senior_School' : sys !== 'CBC_Senior_School';
            }
            return matchSearch && matchForm && matchStream && matchStatus && matchGender && matchCurr;
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
    }, [students, search, filterForm, filterStream, filterStatus, filterGender, filterCurriculum, sortBy, sortDir, forms]);

    const totalPages = Math.ceil(filtered.length / perPage);
    const paginated = filtered.slice((page - 1) * perPage, page * perPage);

    const handleSort = (col: typeof sortBy) => {
        if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortBy(col); setSortDir('asc'); }
    };
    const sortIcon = (col: typeof sortBy) => sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '';
    const getAge = (dob: string) => { if (!dob) return '-'; return `${Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000)}y`; };

    // Selection
    const toggleSelect = (id: number) => {
        setSelectedIds(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    };
    const toggleSelectAll = () => {
        if (selectedIds.size === paginated.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(paginated.map(s => s.id)));
    };
    const allSelected = paginated.length > 0 && selectedIds.size === paginated.length;

    // Adm No generation
    const getNextAdmNo = () => {
        const year = new Date().getFullYear(); let max = 0;
        students.forEach(s => {
            const adm = s.admission_no || s.admission_number || '';
            const match = adm.match(/ADM\/\d{4}\/(\d+)/);
            if (match) { const num = parseInt(match[1], 10); if (!isNaN(num) && num > max) max = num; }
            else { const num = parseInt(adm, 10); if (!isNaN(num) && num > max) max = num; }
        });
        return `ADM/${year}/${String(max + 1).padStart(3, '0')}`;
    };

    // Open modals
    const openAdd = () => { setEditId(null); setFormData({ ...defaultStudent, admission_no: getNextAdmNo() }); setModalTab(0); setSelectedPathwayId(null); setSelectedElectives([]); setShowModal(true); };
    const openEdit = (s: any) => {
        setEditId(s.id);
        setFormData({ ...defaultStudent, ...s, admission_no: s.admission_no || s.admission_number || '', middle_name: s.middle_name || s.other_name || '', medical_conditions: s.medical_conditions || s.medical_info || '', form_id: s.form_id || null, stream_id: s.stream_id || null });
        const existingSubjects = cbcStudentSubjects.filter((ss: any) => ss.student_id === s.id);
        if (existingSubjects.length > 0) { setSelectedPathwayId(existingSubjects[0]?.pathway_id ?? null); setSelectedElectives(existingSubjects.filter((ss: any) => ss.is_elective).map((ss: any) => ss.subject_id)); }
        else { setSelectedPathwayId(null); setSelectedElectives([]); }
        setModalTab(0); setShowModal(true);
    };

    // Save
    const handleSave = async () => {
        if (!formData.admission_no || !formData.first_name || !formData.last_name) { toast.error('Fill admission number, first name and last name'); return; }
        const isCBC = formData.form_id ? getEducationSystem(Number(formData.form_id), forms) === 'CBC_Senior_School' : false;
        if (isCBC) {
            if (!selectedPathwayId) { toast.error('Select a CBC pathway'); return; }
            if (!validateSubjectCombination(selectedElectives)) { toast.error('Select exactly 3 elective subjects'); return; }
        }
        const payload: any = {
            admission_number: formData.admission_no, admission_no: formData.admission_no,
            first_name: formData.first_name, last_name: formData.last_name,
            other_name: formData.middle_name || null, middle_name: formData.middle_name || null,
            gender: formData.gender, date_of_birth: formData.date_of_birth || null,
            form_id: formData.form_id ? Number(formData.form_id) : null, stream_id: formData.stream_id ? Number(formData.stream_id) : null,
            admission_date: formData.admission_date || null, status: formData.status,
            nationality: formData.nationality || null, county: formData.county || null, sub_county: formData.sub_county || null, village: formData.village || null,
            guardian_name: formData.guardian_name || null, guardian_phone: formData.guardian_phone || null, guardian_email: formData.guardian_email || null, guardian_relationship: formData.guardian_relationship || null,
            guardian_id_no: formData.guardian_id_no || null, guardian_occupation: formData.guardian_occupation || null,
            emergency_contact_name: formData.emergency_contact_name || null, emergency_contact_phone: formData.emergency_contact_phone || null,
            blood_group: formData.blood_group || null, medical_info: formData.medical_conditions || null, medical_conditions: formData.medical_conditions || null, special_needs: formData.special_needs || null,
            previous_school: formData.previous_school || null, kcpe_marks: formData.kcpe_marks ? Number(formData.kcpe_marks) : null,
            birth_cert_no: formData.birth_cert_no || null, nemis_no: formData.nemis_no || null, religion: formData.religion || null, notes: formData.notes || null,
        };
        let error; let studentId: number | null = editId;
        if (editId) { ({ error } = await supabase.from('school_students').update(payload).eq('id', editId)); }
        else { const { data: ins, error: ie } = await supabase.from('school_students').insert([payload]).select('id').single(); error = ie; if (ins) studentId = ins.id; }
        if (error) { toast.error(error.message || 'Failed to save'); return; }
        if (isCBC && studentId && selectedPathwayId) {
            try {
                await supabase.from('cbc_student_subjects').delete().eq('student_id', studentId);
                const compIds = [...new Set(cbcPathwaySubjects.filter((ps: any) => ps.is_compulsory).map((ps: any) => ps.subject_id))];
                if (compIds.length > 0) await supabase.from('cbc_student_subjects').insert(compIds.map(sid => ({ student_id: studentId, pathway_id: selectedPathwayId, subject_id: sid, is_elective: false })));
                if (selectedElectives.length > 0) await supabase.from('cbc_student_subjects').insert(selectedElectives.map(sid => ({ student_id: studentId, pathway_id: selectedPathwayId, subject_id: sid, is_elective: true })));
            } catch { }
        }
        toast.success(editId ? 'Student updated ✅' : 'Student enrolled ✅'); setShowModal(false); fetchStudents();
    };

    const handleDelete = async (id: number) => { if (!confirm('Delete this student?')) return; const { error } = await supabase.from('school_students').delete().eq('id', id); if (error) { toast.error('Cannot delete'); return; } toast.success('Student removed'); fetchStudents(); };

    const exportToExcel = () => {
        const headers = ['Adm No','First Name','Last Name','Middle Name','Gender','DOB','Form','Stream','Status','Guardian','Guardian Phone','NEMIS No'];
        const rows = filtered.map(s => [s.admission_no || s.admission_number, s.first_name, s.last_name, s.middle_name || '', s.gender, s.date_of_birth || '', getFormName(s.form_id), getStreamName(s.stream_id), s.status, s.guardian_name || '', s.guardian_phone || '', s.nemis_no || '']);
        const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `APSIMS_Students_${new Date().toISOString().split('T')[0]}.csv`; a.click(); toast.success('Exported ✅');
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = async (ev) => {
            const text = ev.target?.result as string; const lines = text.split('\n').filter(l => l.trim());
            if (lines.length < 2) { toast.error('No data rows'); return; }
            const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
            const admIdx = headers.indexOf('adm no'), fnIdx = headers.indexOf('first name'), lnIdx = headers.indexOf('last name');
            if (admIdx === -1 || fnIdx === -1 || lnIdx === -1) { toast.error('CSV needs: Adm No, First Name, Last Name'); return; }
            let imported = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
                if (!cols[admIdx] || !cols[fnIdx] || !cols[lnIdx]) continue;
                const { error } = await supabase.from('school_students').insert([{ admission_number: cols[admIdx], admission_no: cols[admIdx], first_name: cols[fnIdx], last_name: cols[lnIdx], gender: cols[headers.indexOf('gender')] || 'Male', status: 'Active' }]);
                if (!error) imported++;
            }
            toast.success(`${imported} students imported ✅`); setShowImport(false); fetchStudents();
        };
        reader.readAsText(file);
    };

    const isCBCForm = formData.form_id ? getEducationSystem(Number(formData.form_id), forms) === 'CBC_Senior_School' : false;

    // Bulk action handlers
    const bulkAction = (msg: string) => { toast.success(`${msg} for ${selectedIds.size} students`); setSelectedIds(new Set()); };

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}><FiUsers size={20} /></div>
                        Student Information System
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Comprehensive student management — enrollment, profiles, academics & reporting</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => setShowImport(true)} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 hover:shadow-sm transition-all"><FiUpload size={14} /> Import</button>
                    <button onClick={exportToExcel} className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl flex items-center gap-1.5 hover:bg-gray-50 hover:shadow-sm transition-all"><FiDownload size={14} /> Export</button>
                    <button onClick={openAdd} className="px-5 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-1.5 shadow-lg hover:shadow-xl transition-all" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}><FiPlus size={16} /> Enroll Student</button>
                </div>
            </div>

            {/* KPI Strip */}
            <StudentKPIStrip totalStudents={data.totalStudents} activeCount={data.activeCount} maleCount={data.maleCount} femaleCount={data.femaleCount} cbcCount={data.cbcCount} eightFourFourCount={data.eightFourFourCount} feeCollectionRate={data.feeCollectionRate} defaulterInfo={data.defaulterInfo} />

            {/* Class Distribution */}
            <StudentClassDistribution formDistribution={data.formDistribution} activeCount={data.activeCount} meanAttendance={data.meanAttendance} thisYearAdmissions={data.thisYearAdmissions} nemisSync={data.nemisSync} />

            {/* Module Shortcuts */}
            <StudentModuleShortcuts />

            {/* Filters + View Toggle */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-800">Student roster</h3>
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-full">{filtered.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Sort controls */}
                        <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 mr-2">
                            <span>Sort:</span>
                            {([['name','Name'],['adm','Adm'],['form','Form'],['date','Date']] as const).map(([key, label]) => (
                                <button key={key} onClick={() => handleSort(key as any)} className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${sortBy === key ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>{label} {sortIcon(key as any)}</button>
                            ))}
                        </div>
                        {/* View toggle */}
                        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                            <button onClick={() => setViewMode('table')} className={`p-2 transition-all ${viewMode === 'table' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`} title="Table View"><FiList size={16} /></button>
                            <button onClick={() => setViewMode('card')} className={`p-2 transition-all ${viewMode === 'card' ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:bg-gray-50'}`} title="Card View"><FiGrid size={16} /></button>
                        </div>
                    </div>
                </div>
                <StudentFilterBar search={search} setSearch={setSearch} filterForm={filterForm} setFilterForm={setFilterForm} filterStream={filterStream} setFilterStream={setFilterStream} filterGender={filterGender} setFilterGender={setFilterGender} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterCurriculum={filterCurriculum} setFilterCurriculum={setFilterCurriculum} forms={forms} streams={streams} filteredCount={filtered.length} setPage={setPage} />
            </div>

            {/* Roster */}
            {loading ? (
                <div className="flex justify-center py-20"><div className="w-10 h-10 border-3 border-gray-200 border-t-blue-500 rounded-full animate-spin" style={{ borderWidth: 3 }} /></div>
            ) : viewMode === 'table' ? (
                <StudentTableView paginated={paginated} page={page} perPage={perPage} totalPages={totalPages} filteredCount={filtered.length} forms={forms} streams={streams} cbcPathways={cbcPathways} cbcStudentSubjects={cbcStudentSubjects} selectedIds={selectedIds} toggleSelect={toggleSelect} toggleSelectAll={toggleSelectAll} allSelected={allSelected} getFormName={getFormName} getStreamName={getStreamName} getAge={getAge} getStudentFeeProgress={data.getStudentFeeProgress} getStudentAttendance={data.getStudentAttendance} sortBy={sortBy} sortDir={sortDir} handleSort={handleSort} sortIcon={sortIcon} onQuickView={setShowDetailPanel} onEdit={openEdit} onDelete={handleDelete} setPage={setPage} />
            ) : (
                <StudentCardView paginated={paginated} page={page} perPage={perPage} totalPages={totalPages} filteredCount={filtered.length} forms={forms} cbcPathways={cbcPathways} cbcStudentSubjects={cbcStudentSubjects} selectedIds={selectedIds} toggleSelect={toggleSelect} getFormName={getFormName} getStreamName={getStreamName} getAge={getAge} getStudentFeeProgress={data.getStudentFeeProgress} getStudentAttendance={data.getStudentAttendance} onQuickView={setShowDetailPanel} onEdit={openEdit} onDelete={handleDelete} setPage={setPage} />
            )}

            {/* Bulk Action Bar */}
            <BulkActionBar selectedCount={selectedIds.size} onClearSelection={() => setSelectedIds(new Set())} onCollectFee={() => bulkAction('Fee collection initiated')} onSmsParents={() => bulkAction('SMS sent to parents')} onGenerateId={() => bulkAction('ID cards queued')} onPromote={() => bulkAction('Promotion initiated')} onTransfer={() => bulkAction('Transfer initiated')} />

            {/* Quick View Panel */}
            {showDetailPanel && <StudentQuickViewPanel student={showDetailPanel} getFormName={getFormName} getStreamName={getStreamName} getAge={getAge} onClose={() => setShowDetailPanel(null)} onEdit={openEdit} />}

            {/* Import Modal */}
            {showImport && <StudentImportModal onClose={() => setShowImport(false)} onImportFile={handleImportFile} />}

            {/* Enroll/Edit Modal */}
            <StudentEnrollModal showModal={showModal} editId={editId} formData={formData} setFormData={setFormData} modalTab={modalTab} setModalTab={setModalTab} forms={forms} streams={streams} isCBCForm={isCBCForm} cbcPathways={cbcPathways} cbcPathwaySubjects={cbcPathwaySubjects} allSubjects={allSubjects} selectedPathwayId={selectedPathwayId} selectedElectives={selectedElectives} onPathwayChange={(id) => { setSelectedPathwayId(id); setSelectedElectives([]); }} onElectivesChange={setSelectedElectives} onClose={() => setShowModal(false)} onSave={handleSave} />
        </div>
    );
}

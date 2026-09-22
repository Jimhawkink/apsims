'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import {
  FiPlus, FiEdit2, FiTrash2, FiX, FiSave, FiUsers, FiInfo,
  FiMessageCircle, FiEye, FiEyeOff, FiCopy, FiRefreshCw, FiSend,
  FiShield, FiSettings, FiBook, FiLayers, FiLink, FiCalendar,
  FiCheckCircle, FiAlertCircle, FiChevronRight, FiZap,
} from 'react-icons/fi';
import { counties, getSubCounties } from '@/lib/kenyan-data';
import RubricLevelBadge from '@/components/cbc/RubricLevelBadge';
import PathwayBadge from '@/components/cbc/PathwayBadge';
import { countElectivesForPathway } from '@/lib/cbc-utils';
import ReceiptSettingsWidget from '@/components/settings/ReceiptSettingsWidget';

type Tab = 'forms' | 'streams' | 'subjects' | 'classes' | 'subject-teachers' | 'school-details' | 'cbc-pathways' | 'cbc-grading' | 'sms' | 'mpesa' | 'whatsapp' | 'terms' | 'receipt-settings';

/* ─── tiny helpers ─── */
const TH = ({ children }: { children: React.ReactNode }) => (
  <th className="px-4 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50">{children}</th>
);
const TD = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 text-sm ${className}`}>{children}</td>
);
const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-700',
    green: 'bg-emerald-100 text-emerald-700',
    amber: 'bg-amber-100 text-amber-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    red: 'bg-red-100 text-red-700',
    gray: 'bg-gray-100 text-gray-600',
    orange: 'bg-orange-100 text-orange-700',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${map[color] || map.gray}`}>{children}</span>;
};
const Lbl = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1.5">
    {children}{required && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);
const Inp = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-gray-300 ${props.className || ''}`} />
);
const Sel = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...props} className={`w-full px-3.5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-800 bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none transition-all cursor-pointer appearance-none ${props.className || ''}`} />
);
const SectionCard = ({ icon, title, color, children }: { icon: string; title: string; color: string; children: React.ReactNode }) => {
  const borders: Record<string, string> = { indigo: 'border-l-indigo-500', green: 'border-l-emerald-500', amber: 'border-l-amber-500', blue: 'border-l-blue-500', purple: 'border-l-purple-500', red: 'border-l-red-500' };
  const bgs: Record<string, string> = { indigo: 'bg-indigo-100 text-indigo-600', green: 'bg-emerald-100 text-emerald-600', amber: 'bg-amber-100 text-amber-600', blue: 'bg-blue-100 text-blue-600', purple: 'bg-purple-100 text-purple-600', red: 'bg-red-100 text-red-600' };
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm border-l-4 ${borders[color] || borders.indigo} overflow-hidden`}>
      <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm ${bgs[color] || bgs.indigo}`}>{icon}</div>
        <h4 className="text-xs font-black text-gray-700 uppercase tracking-wide">{title}</h4>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};
const EmptyState = ({ icon, title, sub }: { icon: string; title: string; sub: string }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl">{icon}</div>
    <p className="font-black text-gray-600">{title}</p>
    <p className="text-xs text-gray-400">{sub}</p>
  </div>
);
const ActionBtn = ({ onClick, variant = 'edit' }: { onClick: () => void; variant?: 'edit' | 'delete' }) =>
  variant === 'edit'
    ? <button onClick={onClick} className="p-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:shadow-sm transition-all"><FiEdit2 size={13} /></button>
    : <button onClick={onClick} className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 hover:shadow-sm transition-all"><FiTrash2 size={13} /></button>;

/* ─── Modal shell ─── */
function Modal({ open, onClose, title, subtitle, icon, accentColor = '#6366f1', children }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; icon: string;
  accentColor?: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg,${accentColor},${accentColor}99)` }} />
        <div className="px-6 py-5 flex items-center justify-between" style={{ background: `${accentColor}10` }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: `${accentColor}20` }}>{icon}</div>
            <div>
              <h3 className="text-sm font-black text-gray-900">{title}</h3>
              {subtitle && <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-all shadow-sm">
            <FiX size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
/* ─── SaveBtn ─── */
function SaveBtn({ onClick, loading, label = 'Save', color = '#6366f1' }: { onClick: () => void; loading: boolean; label?: string; color?: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-2 px-8 py-3 text-white font-black text-sm rounded-2xl shadow-lg hover:shadow-xl disabled:opacity-60 transition-all"
      style={{ background: loading ? '#94a3b8' : `linear-gradient(135deg,${color},${color}cc)` }}>
      {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : <><FiSave size={15} />{label}</>}
    </button>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('school-details');
  const [userRole, setUserRole] = useState('');
  useEffect(() => {
    try { const u = JSON.parse(localStorage.getItem('school_user') || '{}'); setUserRole((u.role || '').toLowerCase()); } catch {}
  }, []);
  const isSuperAdmin = ['super-admin', 'superadmin', 'super_admin'].includes(userRole);

  /* ─── State ─── */
  const [forms, setForms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjectTeachers, setSubjectTeachers] = useState<any[]>([]);
  const [schoolDetails, setSchoolDetails] = useState<any>({});
  const [cbcPathways, setCbcPathways] = useState<any[]>([]);
  const [cbcPathwaySubjects, setCbcPathwaySubjects] = useState<any[]>([]);
  const [cbcRubricConfig, setCbcRubricConfig] = useState<any[]>([]);
  const [selectedPathwayForEdit, setSelectedPathwayForEdit] = useState<number | null>(null);
  const [pathwaySubjectDraft, setPathwaySubjectDraft] = useState<number[]>([]);
  const [savingPathway, setSavingPathway] = useState(false);
  const [savingRubric, setSavingRubric] = useState(false);
  const [rubricDraft, setRubricDraft] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [termForm, setTermForm] = useState<any>({ term_name: '', term_number: '', start_date: '', end_date: '', academic_year: new Date().getFullYear(), is_current: false });
  const [editTermId, setEditTermId] = useState<number | null>(null);
  const [showTermModal, setShowTermModal] = useState(false);
  const [settingCurrent, setSettingCurrent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingInfo, setSavingInfo] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState<any>({});

  /* ─── Fetch ─── */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [f, st, su, t, sp] = await Promise.all([
      supabase.from('school_forms').select('*').order('form_level'),
      supabase.from('school_streams').select('*').order('stream_name'),
      supabase.from('school_subjects').select('*').order('subject_name'),
      supabase.from('school_teachers').select('id, first_name, last_name, tsc_number').order('first_name'),
      supabase.from('school_support_teachers').select('id, first_name, last_name, staff_no').order('first_name'),
    ]);
    setForms(f.data || []); setStreams(st.data || []); setSubjects(su.data || []);
    setTeachers([...(t.data || []).map((x: any) => ({ ...x, _source: 'tsc' })), ...(sp.data || []).map((x: any) => ({ ...x, tsc_number: x.staff_no || 'Support', _source: 'support' }))]);
    try { const { data } = await supabase.from('school_classes').select('*'); setClasses(data || []); } catch { setClasses([]); }
    try { const { data } = await supabase.from('school_subject_teachers').select('*'); setSubjectTeachers(data || []); } catch { setSubjectTeachers([]); }
    try { const { data } = await supabase.from('school_details').select('*').limit(1).single(); if (data) setSchoolDetails(data); } catch {}
    try { const { data } = await supabase.from('cbc_pathways').select('*').order('id'); setCbcPathways(data || []); } catch { setCbcPathways([]); }
    try { const { data } = await supabase.from('cbc_pathway_subjects').select('*, school_subjects(id, subject_name, subject_code)'); setCbcPathwaySubjects(data || []); } catch { setCbcPathwaySubjects([]); }
    try {
      const { data } = await supabase.from('cbc_rubric_config').select('*').order('sort_order');
      if (data && data.length > 0) { setCbcRubricConfig(data); setRubricDraft(data.map((r: any) => ({ ...r }))); }
    } catch { setCbcRubricConfig([]); }
    try { const { data } = await supabase.from('school_terms').select('*').order('academic_year', { ascending: false }); setTerms(data || []); } catch { setTerms([]); }
    setLoading(false);
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ─── CRUD helpers ─── */
  const getFormName = (id: number) => forms.find(f => f.id === id)?.form_name || '—';
  const getStreamName = (id: number) => streams.find(s => s.id === id)?.stream_name || '—';
  const getSubjectName = (id: number) => subjects.find(s => s.id === id)?.subject_name || '—';
  const getTeacherName = (id: number) => { const t = teachers.find(t => t.id === id); return t ? `${t.first_name} ${t.last_name}` : '—'; };

  const openAddForm = () => { setEditId(null); setFormData({ form_name: '', form_level: '', description: '' }); setShowModal(true); };
  const openEditForm = (item: any) => { setEditId(item.id); setFormData({ form_name: item.form_name, form_level: item.form_level, description: item.description || '' }); setShowModal(true); };
  const saveForm = async () => {
    if (!formData.form_name || !formData.form_level) { toast.error('Fill all required fields'); return; }
    const payload = { form_name: formData.form_name.trim(), form_level: Number(formData.form_level), description: formData.description || null };
    const { error } = editId ? await supabase.from('school_forms').update(payload).eq('id', editId) : await supabase.from('school_forms').insert([payload]);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? 'Form updated ✅' : 'Form added ✅'); setShowModal(false); fetchAll();
  };
  const deleteForm = async (id: number) => { if (!confirm('Delete this form?')) return; const { error } = await supabase.from('school_forms').delete().eq('id', id); if (error) { toast.error('Cannot delete — may be in use'); return; } toast.success('Deleted'); fetchAll(); };

  const openAddStream = () => { setEditId(null); setFormData({ stream_name: '', description: '' }); setShowModal(true); };
  const openEditStream = (item: any) => { setEditId(item.id); setFormData({ stream_name: item.stream_name, description: item.description || '' }); setShowModal(true); };
  const saveStream = async () => {
    if (!formData.stream_name) { toast.error('Stream name required'); return; }
    const payload = { stream_name: formData.stream_name.trim(), description: formData.description || null };
    const { error } = editId ? await supabase.from('school_streams').update(payload).eq('id', editId) : await supabase.from('school_streams').insert([payload]);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? 'Stream updated ✅' : 'Stream added ✅'); setShowModal(false); fetchAll();
  };
  const deleteStream = async (id: number) => { if (!confirm('Delete this stream?')) return; const { error } = await supabase.from('school_streams').delete().eq('id', id); if (error) { toast.error('Cannot delete — may be in use'); return; } toast.success('Deleted'); fetchAll(); };

  const openAddSubject = () => { setEditId(null); setFormData({ subject_name: '', subject_code: '', category: 'Core' }); setShowModal(true); };
  const openEditSubject = (item: any) => { setEditId(item.id); setFormData({ subject_name: item.subject_name, subject_code: item.subject_code || '', category: item.category || 'Core' }); setShowModal(true); };
  const saveSubject = async () => {
    if (!formData.subject_name) { toast.error('Subject name required'); return; }
    const payload = { subject_name: formData.subject_name.trim(), subject_code: formData.subject_code || null, category: formData.category };
    const { error } = editId ? await supabase.from('school_subjects').update(payload).eq('id', editId) : await supabase.from('school_subjects').insert([payload]);
    if (error) { toast.error(error.message); return; }
    toast.success(editId ? 'Subject updated ✅' : 'Subject added ✅'); setShowModal(false); fetchAll();
  };
  const deleteSubject = async (id: number) => { if (!confirm('Delete this subject?')) return; const { error } = await supabase.from('school_subjects').delete().eq('id', id); if (error) { toast.error('Cannot delete — may be in use'); return; } toast.success('Deleted'); fetchAll(); };

  const openAddClass = () => { setEditId(null); setFormData({ form_id: '', stream_id: '', teacher_id: '', year: new Date().getFullYear() }); setShowModal(true); };
  const openEditClass = (item: any) => { setEditId(item.id); setFormData({ form_id: item.form_id, stream_id: item.stream_id, teacher_id: item.teacher_id || '', year: item.year || new Date().getFullYear() }); setShowModal(true); };
  const saveClass = async () => {
    if (!formData.form_id || !formData.stream_id) { toast.error('Select both form and stream'); return; }
    const payload = { form_id: Number(formData.form_id), stream_id: Number(formData.stream_id), teacher_id: formData.teacher_id ? Number(formData.teacher_id) : null, year: Number(formData.year) };
    const { error } = editId ? await supabase.from('school_classes').update(payload).eq('id', editId) : await supabase.from('school_classes').insert([payload]);
    if (error) { toast.error(error.message || 'Failed — class may already exist'); return; }
    toast.success(editId ? 'Class updated ✅' : 'Class created ✅'); setShowModal(false); fetchAll();
  };
  const deleteClass = async (id: number) => { if (!confirm('Remove this class?')) return; const { error } = await supabase.from('school_classes').delete().eq('id', id); if (error) { toast.error('Cannot delete'); return; } toast.success('Removed'); fetchAll(); };

  const openAddSubjectTeacher = () => { setEditId(null); setFormData({ subject_id: '', teacher_id: '', form_id: '', stream_id: '' }); setShowModal(true); };
  const openEditSubjectTeacher = (item: any) => { setEditId(item.id); setFormData({ subject_id: item.subject_id, teacher_id: item.teacher_id, form_id: item.form_id || '', stream_id: item.stream_id || '' }); setShowModal(true); };
  const saveSubjectTeacher = async () => {
    if (!formData.subject_id || !formData.teacher_id) { toast.error('Select both subject and teacher'); return; }
    const payload = { subject_id: Number(formData.subject_id), teacher_id: Number(formData.teacher_id), form_id: formData.form_id ? Number(formData.form_id) : null, stream_id: formData.stream_id ? Number(formData.stream_id) : null };
    const { error } = editId ? await supabase.from('school_subject_teachers').update(payload).eq('id', editId) : await supabase.from('school_subject_teachers').insert([payload]);
    if (error) { toast.error(error.message || 'Failed — link may already exist'); return; }
    toast.success(editId ? 'Link updated ✅' : 'Subject linked to teacher ✅'); setShowModal(false); fetchAll();
  };
  const deleteSubjectTeacher = async (id: number) => { if (!confirm('Remove this link?')) return; const { error } = await supabase.from('school_subject_teachers').delete().eq('id', id); if (error) { toast.error('Cannot delete'); return; } toast.success('Removed'); fetchAll(); };

  /* ─── CBC ─── */
  const handleSelectPathwayForEdit = (pathwayId: number) => {
    setSelectedPathwayForEdit(pathwayId);
    setPathwaySubjectDraft(cbcPathwaySubjects.filter(ps => ps.pathway_id === pathwayId && !ps.is_compulsory).map(ps => ps.subject_id));
  };
  const toggleElectiveSubject = (subjectId: number) => setPathwaySubjectDraft(prev => prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]);
  const savePathwaySubjects = async () => {
    if (!selectedPathwayForEdit) return;
    for (const subjectId of pathwaySubjectDraft) {
      const existingInOtherPathway = cbcPathwaySubjects.find(ps => ps.subject_id === subjectId && ps.pathway_id !== selectedPathwayForEdit && !ps.is_compulsory);
      if (existingInOtherPathway) {
        const subjectName = subjects.find(s => s.id === subjectId)?.subject_name || `Subject #${subjectId}`;
        const otherPathway = cbcPathways.find(p => p.id === existingInOtherPathway.pathway_id)?.pathway_name || 'another pathway';
        toast.error(`"${subjectName}" is already assigned as an elective in ${otherPathway}.`); return;
      }
    }
    setSavingPathway(true);
    try {
      const currentElectiveRows = cbcPathwaySubjects.filter(ps => ps.pathway_id === selectedPathwayForEdit && !ps.is_compulsory);
      const currentIds = currentElectiveRows.map(ps => ps.subject_id);
      const toDelete = currentIds.filter(id => !pathwaySubjectDraft.includes(id));
      const toInsert = pathwaySubjectDraft.filter(id => !currentIds.includes(id));
      if (toDelete.length > 0) { const { error } = await supabase.from('cbc_pathway_subjects').delete().eq('pathway_id', selectedPathwayForEdit).in('subject_id', toDelete).eq('is_compulsory', false); if (error) throw error; }
      if (toInsert.length > 0) { const { error } = await supabase.from('cbc_pathway_subjects').insert(toInsert.map(subject_id => ({ pathway_id: selectedPathwayForEdit, subject_id, is_compulsory: false }))); if (error) throw error; }
      toast.success('Pathway subjects saved ✅'); await fetchAll();
    } catch (err: any) { toast.error(err.message || 'Failed to save pathway subjects'); }
    finally { setSavingPathway(false); }
  };
  const updateRubricDraft = (levelCode: string, field: string, value: string) => setRubricDraft(prev => prev.map(r => r.level_code === levelCode ? { ...r, [field]: value } : r));
  const saveRubricConfig = async () => {
    setSavingRubric(true);
    try {
      for (const row of rubricDraft) { const { error } = await supabase.from('cbc_rubric_config').update({ level_label: row.level_label, color_hex: row.color_hex, bg_hex: row.bg_hex }).eq('level_code', row.level_code); if (error) throw error; }
      toast.success('Rubric config saved ✅'); await fetchAll();
    } catch (err: any) { toast.error(err.message || 'Failed to save rubric config'); }
    finally { setSavingRubric(false); }
  };

  /* ─── School details ─── */
  const saveSchoolDetails = async () => {
    if (!schoolDetails.school_name?.trim()) { toast.error('School name is required'); return; }
    setSavingInfo(true);
    const payload: any = {};
    Object.keys(schoolDetails).forEach(key => {
      if (['id', 'created_at', 'updated_at'].includes(key)) return;
      const val = schoolDetails[key];
      payload[key] = (typeof val === 'string' && val.trim() === '') ? null : val;
    });
    payload.updated_at = new Date().toISOString();
    let error;
    if (schoolDetails.id) { ({ error } = await supabase.from('school_details').update(payload).eq('id', schoolDetails.id)); }
    else { ({ error } = await supabase.from('school_details').insert([payload])); }
    setSavingInfo(false);
    if (error) { toast.error(error.message || 'Failed to save'); return; }
    toast.success('School details saved ✅'); fetchAll();
  };

  /* ─── Tabs config ─── */
  const TABS: { key: Tab; label: string; icon: string; count: number; group: string }[] = [
    { key: 'school-details', label: 'School Info', icon: '🏫', count: 0, group: 'General' },
    { key: 'terms', label: 'Terms & Year', icon: '📅', count: terms.length, group: 'General' },
    { key: 'forms', label: 'Forms', icon: '📋', count: forms.length, group: 'Academic' },
    { key: 'streams', label: 'Streams', icon: '🏷️', count: streams.length, group: 'Academic' },
    { key: 'subjects', label: 'Subjects', icon: '📚', count: subjects.length, group: 'Academic' },
    { key: 'classes', label: 'Classes', icon: '🏫', count: classes.length, group: 'Academic' },
    { key: 'subject-teachers', label: 'Subject–Teacher', icon: '🔗', count: subjectTeachers.length, group: 'Academic' },
    { key: 'cbc-pathways', label: 'CBC Pathways', icon: '🛤️', count: cbcPathways.length, group: 'CBC' },
    { key: 'cbc-grading', label: 'CBC Grading', icon: '📊', count: cbcRubricConfig.length, group: 'CBC' },
    { key: 'sms', label: 'SMS', icon: '💬', count: 0, group: 'Integrations' },
    { key: 'mpesa', label: 'M-Pesa', icon: '📲', count: 0, group: 'Integrations' },
    { key: 'whatsapp', label: 'WhatsApp', icon: '💚', count: 0, group: 'Integrations' },
    { key: 'receipt-settings', label: 'Receipt No.', icon: '🧾', count: 0, group: 'Integrations' },
  ];

  const openAdd = () => {
    if (tab === 'school-details') return;
    if (tab === 'forms') openAddForm();
    else if (tab === 'streams') openAddStream();
    else if (tab === 'subjects') openAddSubject();
    else if (tab === 'classes') openAddClass();
    else if (tab === 'subject-teachers') openAddSubjectTeacher();
  };
  const handleSave = () => {
    if (tab === 'forms') saveForm();
    else if (tab === 'streams') saveStream();
    else if (tab === 'subjects') saveSubject();
    else if (tab === 'classes') saveClass();
    else saveSubjectTeacher();
  };
  const addLabel: Record<string, string> = { forms: 'Form', streams: 'Stream', subjects: 'Subject', classes: 'Class', 'subject-teachers': 'Link' };
  const modalMeta: Record<string, { icon: string; accent: string; subtitle: string }> = {
    forms: { icon: '📋', accent: '#6366f1', subtitle: 'Create or edit a school form / grade level' },
    streams: { icon: '🏷️', accent: '#0891b2', subtitle: 'Create or edit a stream within a form' },
    subjects: { icon: '📚', accent: '#059669', subtitle: 'Add or edit a subject in the curriculum' },
    classes: { icon: '🏫', accent: '#d97706', subtitle: 'Link a form, stream and class teacher' },
    'subject-teachers': { icon: '🔗', accent: '#7c3aed', subtitle: 'Assign a teacher to a subject' },
  };
  const mm = modalMeta[tab] || { icon: '⚙️', accent: '#6366f1', subtitle: '' };

  /* ─── Stats ─── */
  const statsBar = [
    { label: 'Forms', val: forms.length, color: '#6366f1', bg: '#eef2ff' },
    { label: 'Subjects', val: subjects.length, color: '#059669', bg: '#ecfdf5' },
    { label: 'Teachers', val: teachers.length, color: '#0891b2', bg: '#e0f2fe' },
    { label: 'Classes', val: classes.length, color: '#d97706', bg: '#fef3c7' },
    { label: 'Terms', val: terms.length, color: '#7c3aed', bg: '#f5f3ff' },
  ];

  const showCrudAdd = ['forms', 'streams', 'subjects', 'classes', 'subject-teachers'].includes(tab);

  return (
    <div className="space-y-4">

      {/* ══ ULTRA PREMIUM BANNER ══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899,#f59e0b,#10b981,#0891b2)' }} />
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-2xl shadow-sm">⚙️</div>
            <div>
              <h1 className="text-lg font-black text-gray-900 tracking-tight">System Settings</h1>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Control Centre — School · Forms · CBC · SMS · M-Pesa · WhatsApp</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {statsBar.map((s, i) => (
              <div key={i} className="text-center px-3 py-2 rounded-xl border border-gray-100 shadow-sm" style={{ background: s.bg }}>
                <p className="text-lg font-black leading-none" style={{ color: s.color }}>{s.val}</p>
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
            {showCrudAdd && (
              <button onClick={openAdd}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-black shadow-sm hover:shadow-md transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <FiPlus size={14} /> Add {addLabel[tab] || 'Item'}
              </button>
            )}
            {tab === 'terms' && (
              <button onClick={() => { setEditTermId(null); setTermForm({ term_name: '', term_number: '', start_date: '', end_date: '', academic_year: new Date().getFullYear(), is_current: false }); setShowTermModal(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-black shadow-sm hover:shadow-md transition-all"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <FiPlus size={14} /> Add Term
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══ ULTRA PREMIUM TAB BAR ══ */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2">
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-black whitespace-nowrap transition-all ${
                tab === t.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`}>
              <span className="text-sm">{t.icon}</span>
              {t.label}
              {t.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black min-w-[18px] text-center ${tab === t.key ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ══ LOADING ══ */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center"><FiSettings size={22} className="text-indigo-600 animate-spin" /></div>
          <p className="text-xs text-gray-400 font-bold">Loading settings…</p>
          <div className="flex gap-1.5">{[0, 1, 2].map(i => <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* ══════════ SCHOOL DETAILS ══════════ */}
          {tab === 'school-details' && (
            <div className="p-6 space-y-5">
              {/* Header card */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center"><FiInfo size={18} className="text-indigo-600" /></div>
                <div>
                  <p className="text-sm font-black text-indigo-900">School Information</p>
                  <p className="text-[10px] text-indigo-500 mt-0.5">Configure your school's identity, contact details and bank accounts</p>
                </div>
              </div>

              {/* Basic Info */}
              <SectionCard icon="🏫" title="Basic Information" color="indigo">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'School Name', key: 'school_name', required: true, placeholder: 'Enter school name' },
                    { label: 'Motto', key: 'motto', placeholder: 'School motto' },
                    { label: 'Registration No.', key: 'registration_number', placeholder: 'SCH/2025/001' },
                    { label: 'TSC Code', key: 'tsc_code', placeholder: 'TSC code' },
                    { label: 'KNEC Code', key: 'knec_code', placeholder: 'KNEC code' },
                    { label: 'Sub-County Code', key: 'sub_county_code', placeholder: 'Sub-county code' },
                  ].map(f => (
                    <div key={f.key}>
                      <Lbl required={f.required}>{f.label}</Lbl>
                      <Inp value={schoolDetails[f.key] || ''} onChange={e => setSchoolDetails({ ...schoolDetails, [f.key]: e.target.value })} placeholder={f.placeholder} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* School Type + Level */}
              <SectionCard icon="🏷️" title="Classification" color="purple">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div><Lbl>School Type</Lbl>
                    <Sel value={schoolDetails.school_type || ''} onChange={e => setSchoolDetails({ ...schoolDetails, school_type: e.target.value })}>
                      <option value="">— Select Type —</option>
                      {['Public', 'Private', 'National', 'County', 'Sub-County', 'Extra-County'].map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </div>
                  <div><Lbl>School Category</Lbl>
                    <Sel value={schoolDetails.school_category || ''} onChange={e => setSchoolDetails({ ...schoolDetails, school_category: e.target.value })}>
                      <option value="">— Select Category —</option>
                      {['Mixed Day', 'Boys Boarding', 'Girls Boarding', 'Boys Day', 'Girls Day', 'Mixed Boarding', 'Mixed Day/Boarding'].map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </div>
                  <div><Lbl>Education Level</Lbl>
                    <Sel value={schoolDetails.education_level || ''} onChange={e => setSchoolDetails({ ...schoolDetails, education_level: e.target.value })}>
                      <option value="">— Select Level —</option>
                      {['Primary', 'Secondary', 'Combined (Primary & Secondary)'].map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </div>
                  <div><Lbl>Curriculum</Lbl>
                    <Sel value={schoolDetails.curriculum || ''} onChange={e => setSchoolDetails({ ...schoolDetails, curriculum: e.target.value })}>
                      <option value="">— Select Curriculum —</option>
                      {['8-4-4', 'CBC', 'Both 8-4-4 and CBC', 'IGCSE', 'IB'].map(t => <option key={t} value={t}>{t}</option>)}
                    </Sel>
                  </div>
                  <div><Lbl>Established Year</Lbl>
                    <Inp type="number" value={schoolDetails.established_year || ''} onChange={e => setSchoolDetails({ ...schoolDetails, established_year: e.target.value })} placeholder="e.g. 1985" min={1900} max={2030} />
                  </div>
                  <div><Lbl>Total Capacity</Lbl>
                    <Inp type="number" value={schoolDetails.total_capacity || ''} onChange={e => setSchoolDetails({ ...schoolDetails, total_capacity: e.target.value })} placeholder="Max student capacity" />
                  </div>
                </div>
              </SectionCard>

              {/* Location */}
              <SectionCard icon="📍" title="Location & Address" color="green">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl>Postal Address</Lbl><Inp value={schoolDetails.postal_address || ''} onChange={e => setSchoolDetails({ ...schoolDetails, postal_address: e.target.value })} placeholder="P.O. Box 123" /></div>
                  <div><Lbl>Physical Address</Lbl><Inp value={schoolDetails.physical_address || ''} onChange={e => setSchoolDetails({ ...schoolDetails, physical_address: e.target.value })} placeholder="e.g. Nairobi" /></div>
                  <div><Lbl>County</Lbl>
                    <Sel value={schoolDetails.county || ''} onChange={e => setSchoolDetails({ ...schoolDetails, county: e.target.value, sub_county: '' })}>
                      <option value="">— Select County —</option>
                      {counties.map(c => <option key={c} value={c}>{c}</option>)}
                    </Sel>
                  </div>
                  <div><Lbl>Sub-County</Lbl>
                    <Sel value={schoolDetails.sub_county || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sub_county: e.target.value })}>
                      <option value="">— Select Sub-County —</option>
                      {schoolDetails.county && getSubCounties(schoolDetails.county).map(sc => <option key={sc} value={sc}>{sc}</option>)}
                    </Sel>
                  </div>
                </div>
              </SectionCard>

              {/* Contact */}
              <SectionCard icon="📞" title="Contact Details" color="amber">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Phone 1', key: 'phone1', type: 'tel', placeholder: '0712 345 678' },
                    { label: 'Phone 2', key: 'phone2', type: 'tel', placeholder: '0700 000 000' },
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'school@example.com' },
                    { label: 'Website', key: 'website', type: 'url', placeholder: 'https://' },
                    { label: 'Principal Name', key: 'principal_name', type: 'text', placeholder: 'Mr./Ms. Full Name' },
                    { label: 'Principal Phone', key: 'principal_phone', type: 'tel', placeholder: '0712 000 000' },
                  ].map(f => (
                    <div key={f.key}><Lbl>{f.label}</Lbl><Inp type={f.type} value={schoolDetails[f.key] || ''} onChange={e => setSchoolDetails({ ...schoolDetails, [f.key]: e.target.value })} placeholder={f.placeholder} /></div>
                  ))}
                </div>
              </SectionCard>

              {/* Bank */}
              <SectionCard icon="🏦" title="Bank & Payment Details" color="blue">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { label: 'Bank Name', key: 'bank_name', placeholder: 'e.g. KCB, Equity' },
                    { label: 'Account Name', key: 'bank_account_name', placeholder: 'Official account name' },
                    { label: 'Account Number', key: 'bank_account_number', placeholder: 'Account number' },
                    { label: 'Bank Branch', key: 'bank_branch', placeholder: 'Branch name' },
                    { label: 'M-Pesa Paybill', key: 'mpesa_paybill', placeholder: 'Paybill number' },
                    { label: 'M-Pesa Account Name', key: 'mpesa_account_name', placeholder: 'Account name for Mpesa' },
                  ].map(f => (
                    <div key={f.key}><Lbl>{f.label}</Lbl><Inp value={schoolDetails[f.key] || ''} onChange={e => setSchoolDetails({ ...schoolDetails, [f.key]: e.target.value })} placeholder={f.placeholder} /></div>
                  ))}
                </div>
              </SectionCard>

              <div className="flex justify-end pt-2"><SaveBtn onClick={saveSchoolDetails} loading={savingInfo} label="Save School Details" /></div>
            </div>
          )}

          {/* ══════════ FORMS TABLE ══════════ */}
          {tab === 'forms' && (
            <div>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center text-base">📋</div>
                <div><p className="text-xs font-black text-gray-800">Form Levels / Grades</p><p className="text-[10px] text-gray-400">{forms.length} forms configured</p></div>
              </div>
              {forms.length === 0 ? <EmptyState icon="📋" title="No forms configured yet" sub="Click Add Form above to get started" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr>{['#', 'Form Name', 'Level', 'Description', 'Students', 'Status', 'Actions'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {forms.map((item, i) => (
                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                          <TD className="text-gray-300 font-mono">{i + 1}</TD>
                          <TD className="font-black text-gray-900">{item.form_name}</TD>
                          <TD><Badge color="indigo">Level {item.form_level}</Badge></TD>
                          <TD className="text-gray-500 text-xs">{item.description || <span className="text-gray-300 italic">No description</span>}</TD>
                          <TD><span className="text-xs font-bold text-gray-600">—</span></TD>
                          <TD><Badge color="green">✅ Active</Badge></TD>
                          <TD>
                            <div className="flex gap-2">
                              <ActionBtn onClick={() => openEditForm(item)} variant="edit" />
                              <ActionBtn onClick={() => deleteForm(item.id)} variant="delete" />
                            </div>
                          </TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════ STREAMS TABLE ══════════ */}
          {tab === 'streams' && (
            <div>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-100 flex items-center justify-center text-base">🏷️</div>
                <div><p className="text-xs font-black text-gray-800">Streams / Sections</p><p className="text-[10px] text-gray-400">{streams.length} streams configured</p></div>
              </div>
              {streams.length === 0 ? <EmptyState icon="🏷️" title="No streams yet" sub="Click Add Stream to create your first stream" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr>{['#', 'Stream Name', 'Description', 'Classes Linked', 'Status', 'Actions'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {streams.map((item, i) => (
                        <tr key={item.id} className="hover:bg-cyan-50/30 transition-colors">
                          <TD className="text-gray-300 font-mono">{i + 1}</TD>
                          <TD><span className="font-black text-gray-900">{item.stream_name}</span></TD>
                          <TD className="text-gray-500 text-xs">{item.description || <span className="text-gray-300 italic">No description</span>}</TD>
                          <TD><Badge color="blue">{classes.filter(c => c.stream_id === item.id).length} classes</Badge></TD>
                          <TD><Badge color="green">✅ Active</Badge></TD>
                          <TD><div className="flex gap-2"><ActionBtn onClick={() => openEditStream(item)} variant="edit" /><ActionBtn onClick={() => deleteStream(item.id)} variant="delete" /></div></TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════ SUBJECTS TABLE ══════════ */}
          {tab === 'subjects' && (
            <div>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-base">📚</div>
                <div><p className="text-xs font-black text-gray-800">Curriculum Subjects</p><p className="text-[10px] text-gray-400">{subjects.length} subjects · {subjects.filter(s => s.category === 'Core').length} Core · {subjects.filter(s => s.category === 'Elective').length} Elective</p></div>
              </div>
              {subjects.length === 0 ? <EmptyState icon="📚" title="No subjects yet" sub="Click Add Subject to configure your curriculum" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr>{['#', 'Subject Name', 'Code', 'Category', 'Teachers Linked', 'Status', 'Actions'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {subjects.map((item, i) => {
                        const catColor = item.category === 'Core' ? 'indigo' : item.category === 'Elective' ? 'blue' : 'orange';
                        return (
                          <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                            <TD className="text-gray-300 font-mono">{i + 1}</TD>
                            <TD className="font-black text-gray-900">{item.subject_name}</TD>
                            <TD><span className="font-mono text-[10px] px-2 py-1 rounded-lg bg-gray-100 text-gray-600 font-bold">{item.subject_code || '—'}</span></TD>
                            <TD><Badge color={catColor}>{item.category}</Badge></TD>
                            <TD><Badge color="purple">{subjectTeachers.filter(st => st.subject_id === item.id).length} teachers</Badge></TD>
                            <TD><Badge color="green">✅ Active</Badge></TD>
                            <TD><div className="flex gap-2"><ActionBtn onClick={() => openEditSubject(item)} variant="edit" /><ActionBtn onClick={() => deleteSubject(item.id)} variant="delete" /></div></TD>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════ CLASSES TABLE ══════════ */}
          {tab === 'classes' && (
            <div>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-base">🏫</div>
                  <div><p className="text-xs font-black text-gray-800">Form–Stream Classes</p><p className="text-[10px] text-gray-400">{classes.length} classes linked</p></div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                  <FiInfo size={13} className="text-blue-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-blue-700">Class = Form + Stream + Class Teacher</p>
                </div>
              </div>
              {classes.length === 0 ? <EmptyState icon="🏫" title="No classes created yet" sub="Link forms with streams and assign class teachers" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr>{['#', 'Form', 'Stream', 'Class Name', 'Class Teacher', 'Year', 'Actions'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {classes.map((item, i) => (
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                          <TD className="text-gray-300 font-mono">{i + 1}</TD>
                          <TD><Badge color="indigo">{getFormName(item.form_id)}</Badge></TD>
                          <TD><Badge color="blue">{getStreamName(item.stream_id)}</Badge></TD>
                          <TD><span className="font-black text-gray-900 text-sm">{getFormName(item.form_id)} {getStreamName(item.stream_id)}</span></TD>
                          <TD>
                            {item.teacher_id
                              ? <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-xs"><FiUsers size={12} />{getTeacherName(item.teacher_id)}</span>
                              : <span className="text-gray-300 italic text-xs">Not assigned</span>}
                          </TD>
                          <TD><Badge color="amber">{item.year}</Badge></TD>
                          <TD><div className="flex gap-2"><ActionBtn onClick={() => openEditClass(item)} variant="edit" /><ActionBtn onClick={() => deleteClass(item.id)} variant="delete" /></div></TD>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════ SUBJECT-TEACHERS TABLE ══════════ */}
          {tab === 'subject-teachers' && (
            <div>
              <div className="px-5 py-4 border-b border-gray-50 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-base">🔗</div>
                  <div><p className="text-xs font-black text-gray-800">Subject–Teacher Assignments</p><p className="text-[10px] text-gray-400">{subjectTeachers.length} links · Assign teachers to their subjects</p></div>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-100 rounded-xl">
                  <FiInfo size={13} className="text-purple-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-purple-700">Scope to a specific form or stream</p>
                </div>
              </div>
              {subjectTeachers.length === 0 ? <EmptyState icon="🔗" title="No subject-teacher links yet" sub="Assign teachers to their subjects" /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead><tr>{['#', 'Subject', 'Teacher', 'TSC No.', 'Form', 'Stream', 'Scope', 'Actions'].map(h => <TH key={h}>{h}</TH>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">
                      {subjectTeachers.map((item, i) => {
                        const teacher = teachers.find(t => t.id === item.teacher_id);
                        const scopeLabel = !item.form_id ? 'All Forms' : !item.stream_id ? `${getFormName(item.form_id)} — All Streams` : `${getFormName(item.form_id)} ${getStreamName(item.stream_id)}`;
                        return (
                          <tr key={item.id} className="hover:bg-purple-50/30 transition-colors">
                            <TD className="text-gray-300 font-mono">{i + 1}</TD>
                            <TD><Badge color="purple">{getSubjectName(item.subject_id)}</Badge></TD>
                            <TD className="font-bold text-gray-800 text-xs">{getTeacherName(item.teacher_id)}</TD>
                            <TD><span className="font-mono text-[10px] text-gray-500">{teacher?.tsc_number || '—'}</span></TD>
                            <TD>{item.form_id ? <Badge color="indigo">{getFormName(item.form_id)}</Badge> : <span className="text-gray-300 text-xs italic">All</span>}</TD>
                            <TD>{item.stream_id ? <Badge color="orange">{getStreamName(item.stream_id)}</Badge> : <span className="text-gray-300 text-xs italic">All</span>}</TD>
                            <TD><Badge color="blue">{scopeLabel}</Badge></TD>
                            <TD><div className="flex gap-2"><ActionBtn onClick={() => openEditSubjectTeacher(item)} variant="edit" /><ActionBtn onClick={() => deleteSubjectTeacher(item.id)} variant="delete" /></div></TD>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════ CBC PATHWAYS ══════════ */}
          {tab === 'cbc-pathways' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-lg">🛤️</div>
                <div><p className="text-sm font-black text-indigo-900">CBC Senior School Pathways</p><p className="text-[10px] text-indigo-500">Assign elective subjects to each pathway. Each non-compulsory subject may belong to only one pathway.</p></div>
              </div>
              {cbcPathways.length === 0 ? (
                <EmptyState icon="🛤️" title="No pathways found" sub="Run the CBC migration SQL to seed the three pathways." />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {cbcPathways.map(pathway => {
                      const electiveCount = countElectivesForPathway(pathway.id, cbcPathwaySubjects);
                      const isSelected = selectedPathwayForEdit === pathway.id;
                      return (
                        <button key={pathway.id} onClick={() => handleSelectPathwayForEdit(pathway.id)}
                          className={`text-left p-5 rounded-2xl border-2 transition-all hover:shadow-md ${isSelected ? 'border-indigo-400 bg-indigo-50 shadow-lg shadow-indigo-100' : 'border-gray-200 bg-white hover:border-indigo-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <PathwayBadge pathwayName={pathway.pathway_name} colorHex={pathway.color_hex} />
                            {electiveCount < 3 && <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-100 text-amber-700 border border-amber-200">⚠️ {electiveCount} electives</span>}
                          </div>
                          <p className="font-black text-gray-800 text-sm">{pathway.pathway_name}</p>
                          {pathway.description && <p className="text-xs text-gray-400 mt-1">{pathway.description}</p>}
                          <div className="mt-3 flex items-center gap-1.5">
                            <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-1.5 bg-indigo-400 rounded-full" style={{ width: `${Math.min((electiveCount / 5) * 100, 100)}%` }} />
                            </div>
                            <span className={`text-[9px] font-black ${electiveCount >= 3 ? 'text-emerald-600' : 'text-amber-600'}`}>{electiveCount} subjects</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedPathwayForEdit !== null && (() => {
                    const pathway = cbcPathways.find(p => p.id === selectedPathwayForEdit);
                    const compulsorySubjectIds = cbcPathwaySubjects.filter(ps => ps.is_compulsory).map(ps => ps.subject_id);
                    const compulsorySubjects = subjects.filter(s => compulsorySubjectIds.includes(s.id));
                    const nonCompulsorySubjects = subjects.filter(s => !compulsorySubjectIds.includes(s.id));
                    return (
                      <div className="border-2 border-indigo-200 rounded-2xl overflow-hidden">
                        <div className="bg-indigo-50 px-5 py-4 border-b border-indigo-200 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-black text-indigo-800">✏️ Editing: {pathway?.pathway_name}</p>
                            <p className="text-[10px] text-indigo-500 mt-0.5">Check subjects to assign as electives for this pathway</p>
                          </div>
                          <SaveBtn onClick={savePathwaySubjects} loading={savingPathway} label="Save Pathway" color="#6366f1" />
                        </div>
                        <div className="p-5 space-y-5">
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">🔒 Compulsory Subjects (all pathways)</p>
                            <div className="flex flex-wrap gap-2">
                              {compulsorySubjects.length === 0
                                ? <span className="text-xs text-gray-300 italic">No compulsory subjects configured</span>
                                : compulsorySubjects.map(s => <span key={s.id} className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">🔒 {s.subject_name}</span>)}
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">📚 Elective Subjects</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                              {nonCompulsorySubjects.map(s => {
                                const isChecked = pathwaySubjectDraft.includes(s.id);
                                const assignedElsewhere = cbcPathwaySubjects.find(ps => ps.subject_id === s.id && ps.pathway_id !== selectedPathwayForEdit && !ps.is_compulsory);
                                const otherPathwayName = assignedElsewhere ? cbcPathways.find(p => p.id === assignedElsewhere.pathway_id)?.pathway_name : null;
                                return (
                                  <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${isChecked ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 bg-white hover:border-indigo-200'} ${assignedElsewhere && !isChecked ? 'opacity-50' : ''}`}>
                                    <input type="checkbox" checked={isChecked} onChange={() => toggleElectiveSubject(s.id)} className="w-4 h-4 accent-indigo-600" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-bold text-gray-800 truncate">{s.subject_name}</p>
                                      {s.subject_code && <p className="text-[9px] text-gray-400 font-mono">{s.subject_code}</p>}
                                      {otherPathwayName && !isChecked && <p className="text-[9px] text-amber-600 font-bold">In: {otherPathwayName}</p>}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* ══════════ CBC GRADING ══════════ */}
          {tab === 'cbc-grading' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">📊</div>
                <div><p className="text-sm font-black text-emerald-900">CBC Grading / Rubric Configuration</p><p className="text-[10px] text-emerald-500">Customize labels and colors for each CBC rubric level. Affects all report cards.</p></div>
              </div>
              <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl">
                <FiInfo size={14} className="text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">The four rubric levels (EE, ME, AE, BE) are fixed and cannot be deleted. You can only update their labels and colors.</p>
              </div>
              {rubricDraft.length === 0 ? <EmptyState icon="📊" title="No rubric config found" sub="Run the CBC migration SQL to seed the rubric levels." /> : (
                <>
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Rubric Level Configuration</p>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {rubricDraft.map(row => (
                        <div key={row.level_code} className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-shrink-0 w-16"><RubricLevelBadge level={row.level_code} rubricConfig={rubricDraft} size="md" /></div>
                          <div className="flex-1"><Lbl>Label</Lbl><Inp value={row.level_label || ''} onChange={e => updateRubricDraft(row.level_code, 'level_label', e.target.value)} placeholder="e.g. Exceeds Expectation" /></div>
                          <div className="w-36">
                            <Lbl>Text Color</Lbl>
                            <div className="flex items-center gap-2">
                              <Inp value={row.color_hex || ''} onChange={e => updateRubricDraft(row.level_code, 'color_hex', e.target.value)} placeholder="#15803d" maxLength={7} className="font-mono text-xs" />
                              <div className="w-9 h-10 rounded-xl border-2 border-gray-200 flex-shrink-0 cursor-pointer shadow-sm" style={{ backgroundColor: row.color_hex || '#6b7280' }} />
                            </div>
                          </div>
                          <div className="w-36">
                            <Lbl>Background</Lbl>
                            <div className="flex items-center gap-2">
                              <Inp value={row.bg_hex || ''} onChange={e => updateRubricDraft(row.level_code, 'bg_hex', e.target.value)} placeholder="#f0fdf4" maxLength={7} className="font-mono text-xs" />
                              <div className="w-9 h-10 rounded-xl border-2 border-gray-200 flex-shrink-0 cursor-pointer shadow-sm" style={{ backgroundColor: row.bg_hex || '#f3f4f6' }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Preview</p>
                    <div className="flex flex-wrap gap-4">
                      {rubricDraft.map(row => (
                        <div key={row.level_code} className="flex flex-col items-center gap-1.5">
                          <RubricLevelBadge level={row.level_code} rubricConfig={rubricDraft} size="md" />
                          <span className="text-[9px] text-gray-400 text-center max-w-[80px] leading-tight">{row.level_label || row.level_code}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end"><SaveBtn onClick={saveRubricConfig} loading={savingRubric} label="Save Grading Config" color="#10b981" /></div>
                </>
              )}
            </div>
          )}

          {/* ══════════ SMS CONFIG ══════════ */}
          {tab === 'sms' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center"><FiMessageCircle size={18} className="text-amber-600" /></div>
                <div><p className="text-sm font-black text-amber-900">SMS & Notifications — Africa's Talking</p><p className="text-[10px] text-amber-500">Configure SMS gateway for leave-out alerts, fee reminders and bulk parent communication</p></div>
              </div>
              <SectionCard icon="💬" title="Africa's Talking Configuration" color="amber">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl>SMS Enabled</Lbl>
                    <Sel value={schoolDetails.sms_enabled ? 'true' : 'false'} onChange={e => setSchoolDetails({ ...schoolDetails, sms_enabled: e.target.value === 'true' })}>
                      <option value="false">❌ Disabled</option><option value="true">✅ Enabled</option>
                    </Sel>
                  </div>
                  <div><Lbl>Provider</Lbl><Inp value={schoolDetails.sms_provider || 'AfricasTalking'} onChange={e => setSchoolDetails({ ...schoolDetails, sms_provider: e.target.value })} placeholder="AfricasTalking" /></div>
                  <div><Lbl>SMS Username</Lbl><Inp value={schoolDetails.sms_username || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sms_username: e.target.value })} placeholder="sandbox or your AT username" /></div>
                  <div><Lbl>🔑 SMS API Key</Lbl>
                    <div className="relative">
                      <Inp type={showApiKey ? 'text' : 'password'} value={schoolDetails.sms_api_key || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sms_api_key: e.target.value })} placeholder="Your API Key" className="pr-20" />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {schoolDetails.sms_api_key && <button onClick={() => { navigator.clipboard.writeText(schoolDetails.sms_api_key); toast.success('Copied!'); }} className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 transition"><FiCopy size={13} /></button>}
                        <button onClick={() => setShowApiKey(!showApiKey)} className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 transition">{showApiKey ? <FiEyeOff size={13} /> : <FiEye size={13} />}</button>
                      </div>
                    </div>
                  </div>
                  <div><Lbl>Sender ID</Lbl><Inp value={schoolDetails.sms_sender_id || ''} onChange={e => setSchoolDetails({ ...schoolDetails, sms_sender_id: e.target.value })} placeholder="APSIMS" /></div>
                  <div><Lbl>Environment</Lbl>
                    <Sel value={schoolDetails.sms_is_sandbox ? 'true' : 'false'} onChange={e => setSchoolDetails({ ...schoolDetails, sms_is_sandbox: e.target.value === 'true' })}>
                      <option value="true">🧪 Sandbox (Testing)</option><option value="false">🚀 Production (Live)</option>
                    </Sel>
                  </div>
                </div>
              </SectionCard>
              <SectionCard icon="🧪" title="Test SMS" color="green">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div><Lbl>Phone Number</Lbl><Inp value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="0712345678" /></div>
                  <div><Lbl>Message</Lbl><Inp value={testMessage} onChange={e => setTestMessage(e.target.value)} placeholder="Test SMS from APSIMS" /></div>
                </div>
                <button onClick={async () => {
                  if (!testPhone || !testMessage) { toast.error('Enter phone and message'); return; }
                  setSendingTest(true); setTestResult(null);
                  try {
                    const res = await fetch('/api/send-sms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: testPhone, message: testMessage }) });
                    const data = await res.json(); setTestResult(data);
                    if (data.success) toast.success('✅ Test SMS sent!'); else toast.error(data.error || 'Failed');
                  } catch (e: any) { toast.error(e.message); setTestResult({ error: e.message }); }
                  setSendingTest(false);
                }} disabled={sendingTest} className="flex items-center gap-2 px-5 py-2.5 font-black text-sm text-white rounded-2xl shadow hover:shadow-md disabled:opacity-60 transition-all" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                  {sendingTest ? <><FiRefreshCw size={14} className="animate-spin" />Sending…</> : <><FiSend size={14} />Send Test SMS</>}
                </button>
                {testResult && <div className={`mt-3 px-4 py-3 rounded-2xl text-xs font-mono ${testResult.success ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>{JSON.stringify(testResult, null, 2)}</div>}
              </SectionCard>
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                <FiInfo size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-amber-800 mb-1">How SMS works in APSIMS</p>
                  <ul className="text-[10px] text-amber-700 space-y-1 list-disc list-inside">
                    <li>Leave-out notifications auto-send when a student is issued a leave pass</li>
                    <li>Fee reminders and demand letters via the Communication page</li>
                    <li>All sent messages are logged in the SMS Logs table</li>
                    <li>Use 'sandbox' mode for testing — no real SMS is sent</li>
                  </ul>
                </div>
              </div>
              <div className="flex justify-end"><SaveBtn onClick={saveSchoolDetails} loading={savingInfo} label="Save SMS Settings" color="#f59e0b" /></div>
            </div>
          )}

          {/* ══════════ M-PESA CONFIG ══════════ */}
          {tab === 'mpesa' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">📲</div>
                <div><p className="text-sm font-black text-emerald-900">M-Pesa STK Push Configuration</p><p className="text-[10px] text-emerald-500">Configure Safaricom Daraja API for STK Push payments. Parents pay directly from their phones.</p></div>
              </div>
              <SectionCard icon="🔑" title="Daraja API Credentials" color="green">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { key: 'mpesa_consumer_key', label: 'Consumer Key', placeholder: 'Daraja Consumer Key', secret: false },
                    { key: 'mpesa_consumer_secret', label: 'Consumer Secret', placeholder: 'Daraja Consumer Secret', secret: true },
                    { key: 'mpesa_shortcode', label: 'Business Shortcode', placeholder: '174379' },
                    { key: 'mpesa_passkey', label: 'Lipa Na M-Pesa Passkey', placeholder: 'Online passkey', secret: true },
                    { key: 'mpesa_callback_url', label: 'Callback URL', placeholder: 'https://yourschool.com/api/mpesa/callback' },
                    { key: 'mpesa_environment', label: 'Environment', placeholder: 'sandbox or production' },
                  ].map(f => (
                    <div key={f.key}><Lbl>{f.label}</Lbl><Inp type={(f as any).secret ? 'password' : 'text'} value={(schoolDetails as any)[f.key] || ''} onChange={e => setSchoolDetails({ ...schoolDetails, [f.key]: e.target.value })} placeholder={f.placeholder} /></div>
                  ))}
                  <div className="sm:col-span-2">
                    <Lbl>Account Reference Prefix</Lbl>
                    <Inp value={schoolDetails.mpesa_account_prefix || 'FEE'} onChange={e => setSchoolDetails({ ...schoolDetails, mpesa_account_prefix: e.target.value })} placeholder="e.g. FEE or ADM" />
                    <p className="text-[10px] text-gray-400 mt-1">Prefix + student admission no = M-Pesa account reference (e.g. FEE-2024001)</p>
                  </div>
                </div>
              </SectionCard>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <p className="text-xs font-black text-emerald-800 mb-2">✅ How M-Pesa STK Push works in APSIMS:</p>
                <ol className="text-[10px] text-emerald-700 space-y-1 list-decimal list-inside">
                  <li>Admin clicks "Collect Fee via M-Pesa" from the student fee page</li>
                  <li>APSIMS sends an STK Push prompt to the parent's phone</li>
                  <li>Parent enters M-Pesa PIN to confirm payment</li>
                  <li>Safaricom callback fires and fee is automatically recorded</li>
                  <li>Parent receives SMS receipt automatically</li>
                </ol>
              </div>
              <div className="flex justify-end"><SaveBtn onClick={saveSchoolDetails} loading={savingInfo} label="Save M-Pesa Config" color="#16a34a" /></div>
            </div>
          )}

          {/* ══════════ WHATSAPP CONFIG ══════════ */}
          {tab === 'whatsapp' && (
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-lg">💚</div>
                <div><p className="text-sm font-black text-emerald-900">WhatsApp Integration</p><p className="text-[10px] text-emerald-500">Send report cards, fee reminders and attendance alerts to parents via WhatsApp</p></div>
              </div>
              <SectionCard icon="⚙️" title="WhatsApp API Settings" color="green">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><Lbl>Provider</Lbl>
                    <Sel value={schoolDetails.whatsapp_provider || 'ultramsg'} onChange={e => setSchoolDetails({ ...schoolDetails, whatsapp_provider: e.target.value })}>
                      <option value="ultramsg">UltraMsg (Recommended)</option>
                      <option value="whatsapp-business">Official WhatsApp Business API</option>
                      <option value="twilio">Twilio WhatsApp</option>
                      <option value="whatsmate">WhatsMate</option>
                      <option value="africas-talking">Africa's Talking</option>
                    </Sel>
                  </div>
                  {[
                    { key: 'whatsapp_api_url', label: 'API Base URL', placeholder: 'https://api.ultramsg.com/instance...' },
                    { key: 'whatsapp_token', label: 'API Token / Secret', placeholder: 'Your API token', secret: true },
                    { key: 'whatsapp_instance_id', label: 'Instance ID', placeholder: 'instance12345' },
                    { key: 'whatsapp_phone_number', label: 'Business Phone Number', placeholder: '+254700000000' },
                  ].map(f => (
                    <div key={f.key}><Lbl>{f.label}</Lbl><Inp type={(f as any).secret ? 'password' : 'text'} value={(schoolDetails as any)[f.key] || ''} onChange={e => setSchoolDetails({ ...schoolDetails, [f.key]: e.target.value })} placeholder={f.placeholder} /></div>
                  ))}
                  <div><Lbl>WhatsApp Enabled</Lbl>
                    <Sel value={schoolDetails.whatsapp_enabled ? 'true' : 'false'} onChange={e => setSchoolDetails({ ...schoolDetails, whatsapp_enabled: e.target.value === 'true' })}>
                      <option value="false">❌ Disabled</option><option value="true">✅ Enabled</option>
                    </Sel>
                  </div>
                </div>
              </SectionCard>
              <div className="flex justify-end"><SaveBtn onClick={saveSchoolDetails} loading={savingInfo} label="Save WhatsApp Config" color="#25d366" /></div>
            </div>
          )}

          {/* ══════════ RECEIPT SETTINGS ══════════ */}
          {tab === 'receipt-settings' && (
            <div className="p-6 space-y-5">
              {isSuperAdmin ? <ReceiptSettingsWidget /> : (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center"><span className="text-4xl">🔐</span></div>
                  <h2 className="text-xl font-black text-gray-800">Super Admin Only</h2>
                  <p className="text-gray-400 text-sm text-center max-w-sm">Receipt numbering configuration is restricted to <strong>Super Admin</strong> users only.</p>
                  <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-xl"><p className="text-xs font-black text-red-600">Your current role: <span className="uppercase">{userRole || 'unknown'}</span></p></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ TERMS TAB ══════════ */}
      {!loading && tab === 'terms' && (
        <div className="space-y-4">
          {/* Info */}
          <div className="flex items-start gap-3 px-5 py-4 bg-amber-50 border border-amber-100 rounded-2xl shadow-sm">
            <span className="text-xl flex-shrink-0">💡</span>
            <div>
              <p className="text-xs font-black text-amber-800">How Terms Work in APSIMS</p>
              <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">Only <strong>ONE term</strong> can be active at a time. All fees, exam marks, SMS reminders and reports use the active term automatically. Click <strong>"Set as Current"</strong> when a new term begins.</p>
            </div>
          </div>

          {/* Terms list */}
          {terms.length === 0 ? (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-4xl">📅</div>
              <p className="font-black text-gray-600">No terms configured yet</p>
              <p className="text-xs text-gray-400">Click "+ Add Term" above to create your first term</p>
            </div>
          ) : (
            <div className="space-y-3">
              {terms.map((term: any) => {
                const isCurrent = !!term.is_current;
                const today = new Date();
                const start = term.start_date ? new Date(term.start_date) : null;
                const end = term.end_date ? new Date(term.end_date) : null;
                const isRunning = !!(start && end && today >= start && today <= end);
                const isPast = !!(end && today > end);
                return (
                  <div key={term.id} className={`bg-white rounded-2xl border-2 p-5 flex items-center gap-5 flex-wrap transition-all relative overflow-hidden ${isCurrent ? 'border-indigo-300 shadow-lg shadow-indigo-100' : 'border-gray-100 shadow-sm hover:shadow-md'}`}>
                    {isCurrent && <div className="absolute inset-x-0 top-0 h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)' }} />}
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow-sm ${isCurrent ? 'bg-indigo-500' : isPast ? 'bg-red-300' : isRunning ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                    <div className="flex-1 min-w-48">
                      <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
                        <span className={`text-base font-black ${isCurrent ? 'text-indigo-700' : 'text-gray-900'}`}>{term.term_name}</span>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide ${isCurrent ? 'bg-indigo-600 text-white' : isPast ? 'bg-red-100 text-red-600' : isRunning ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {isCurrent ? '✓ ACTIVE NOW' : isPast ? 'PAST' : isRunning ? 'RUNNING' : 'UPCOMING'}
                        </span>
                        <Badge color="gray">Academic Year {term.academic_year || '—'}</Badge>
                      </div>
                      <p className="text-[11px] text-gray-400">
                        📆 {term.start_date ? new Date(term.start_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No start date'}
                        {' → '}
                        {term.end_date ? new Date(term.end_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No end date'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!isCurrent && (
                        <button disabled={settingCurrent === term.id}
                          onClick={async () => {
                            setSettingCurrent(term.id);
                            await supabase.from('school_terms').update({ is_current: false }).neq('id', 0);
                            const { error } = await supabase.from('school_terms').update({ is_current: true }).eq('id', term.id);
                            if (error) { toast.error('Failed: ' + error.message); } else { toast.success(`✅ ${term.term_name} is now the active term!`); fetchAll(); }
                            setSettingCurrent(null);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 border-indigo-300 text-indigo-600 text-xs font-black hover:bg-indigo-50 transition disabled:opacity-50 whitespace-nowrap">
                          <FiCheckCircle size={13} />{settingCurrent === term.id ? 'Setting…' : 'Set as Current'}
                        </button>
                      )}
                      <button onClick={() => { setEditTermId(term.id); setTermForm({ term_name: term.term_name || '', term_number: term.term_number || '', start_date: term.start_date || '', end_date: term.end_date || '', academic_year: term.academic_year || new Date().getFullYear(), is_current: term.is_current || false }); setShowTermModal(true); }}
                        className="p-2.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition"><FiEdit2 size={14} /></button>
                      {!isCurrent && (
                        <button onClick={async () => {
                          if (!confirm(`Delete "${term.term_name}"? This cannot be undone.`)) return;
                          const { error } = await supabase.from('school_terms').delete().eq('id', term.id);
                          if (error) { toast.error('Cannot delete — term may have fees or marks linked to it'); return; }
                          toast.success('Term deleted'); fetchAll();
                        }} className="p-2.5 rounded-xl border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition"><FiTrash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ CRUD MODAL (Forms / Streams / Subjects / Classes / Subject-Teachers) ══════════ */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={`${editId ? 'Edit' : 'Add New'} ${addLabel[tab] || 'Item'}`}
        subtitle={mm.subtitle}
        icon={mm.icon}
        accentColor={mm.accent}>

        {/* FORM fields */}
        {tab === 'forms' && <>
          <div><Lbl required>Form Name</Lbl><Inp value={formData.form_name || ''} onChange={e => setFormData({ ...formData, form_name: e.target.value })} placeholder="e.g. Form 1" /></div>
          <div><Lbl required>Form Level</Lbl><Inp type="number" value={formData.form_level || ''} onChange={e => setFormData({ ...formData, form_level: e.target.value })} placeholder="1" min={1} max={6} /></div>
          <div><Lbl>Description</Lbl><Inp value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" /></div>
        </>}

        {/* STREAM fields */}
        {tab === 'streams' && <>
          <div><Lbl required>Stream Name</Lbl><Inp value={formData.stream_name || ''} onChange={e => setFormData({ ...formData, stream_name: e.target.value })} placeholder="e.g. East, West, North" /></div>
          <div><Lbl>Description</Lbl><Inp value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional description" /></div>
        </>}

        {/* SUBJECT fields */}
        {tab === 'subjects' && <>
          <div><Lbl required>Subject Name</Lbl><Inp value={formData.subject_name || ''} onChange={e => setFormData({ ...formData, subject_name: e.target.value })} placeholder="e.g. Mathematics" /></div>
          <div><Lbl>Subject Code</Lbl><Inp value={formData.subject_code || ''} onChange={e => setFormData({ ...formData, subject_code: e.target.value })} placeholder="e.g. MATH" /></div>
          <div><Lbl>Category</Lbl>
            <Sel value={formData.category || 'Core'} onChange={e => setFormData({ ...formData, category: e.target.value })}>
              <option value="Core">Core</option><option value="Elective">Elective</option><option value="Technical">Technical</option><option value="Optional">Optional</option>
            </Sel>
          </div>
        </>}

        {/* CLASS fields */}
        {tab === 'classes' && <>
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl"><FiInfo size={14} className="text-blue-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-blue-700 font-bold">A class is a combination of Form + Stream + Class Teacher</p></div>
          <div><Lbl required>Form</Lbl><Sel value={formData.form_id || ''} onChange={e => setFormData({ ...formData, form_id: e.target.value })}><option value="">Select Form</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</Sel></div>
          <div><Lbl required>Stream</Lbl><Sel value={formData.stream_id || ''} onChange={e => setFormData({ ...formData, stream_id: e.target.value })}><option value="">Select Stream</option>{streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}</Sel></div>
          <div><Lbl>Class Teacher (optional)</Lbl><Sel value={formData.teacher_id || ''} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}><option value="">No Teacher Assigned</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} {t.tsc_number ? `(${t.tsc_number})` : ''}</option>)}</Sel></div>
          <div><Lbl>Academic Year</Lbl><Inp type="number" value={formData.year || new Date().getFullYear()} onChange={e => setFormData({ ...formData, year: e.target.value })} placeholder="2026" /></div>
          {formData.form_id && formData.stream_id && (
            <div className="px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
              <p className="text-xs font-black text-indigo-700">Preview: <span className="font-black">{getFormName(Number(formData.form_id))} {getStreamName(Number(formData.stream_id))}</span></p>
            </div>
          )}
        </>}

        {/* SUBJECT-TEACHER fields */}
        {tab === 'subject-teachers' && <>
          <div className="flex items-start gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl"><FiLink size={14} className="text-purple-500 flex-shrink-0 mt-0.5" /><p className="text-xs text-purple-700 font-bold">Link a subject to a teacher — optionally scope to a specific form and/or stream</p></div>
          <div><Lbl required>Subject</Lbl><Sel value={formData.subject_id || ''} onChange={e => setFormData({ ...formData, subject_id: e.target.value })}><option value="">Select Subject</option>{subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name} {s.subject_code ? `(${s.subject_code})` : ''}</option>)}</Sel></div>
          <div><Lbl required>Teacher</Lbl><Sel value={formData.teacher_id || ''} onChange={e => setFormData({ ...formData, teacher_id: e.target.value })}><option value="">Select Teacher</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} {t.tsc_number ? `(${t.tsc_number})` : ''}</option>)}</Sel></div>
          <div><Lbl>Form <span className="text-gray-300 font-normal lowercase">(leave empty for all forms)</span></Lbl><Sel value={formData.form_id || ''} onChange={e => setFormData({ ...formData, form_id: e.target.value, stream_id: '' })}><option value="">All Forms</option>{forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}</Sel></div>
          <div><Lbl>Stream <span className="text-gray-300 font-normal lowercase">(leave empty for all streams)</span></Lbl>
            <Sel value={formData.stream_id || ''} onChange={e => setFormData({ ...formData, stream_id: e.target.value })} disabled={!formData.form_id}>
              <option value="">{formData.form_id ? 'All Streams' : 'Select a form first'}</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.stream_name}</option>)}
            </Sel>
          </div>
          <div className="px-3 py-2.5 bg-gray-50 border border-gray-100 rounded-xl">
            <p className="text-[10px] font-black text-gray-500">Scope preview: <span className="text-gray-700">{!formData.form_id ? '📚 All Forms — All Streams' : !formData.stream_id ? `📋 ${getFormName(Number(formData.form_id))} — All Streams` : `🏷️ ${getFormName(Number(formData.form_id))} ${getStreamName(Number(formData.stream_id))}`}</span></p>
          </div>
        </>}

        {/* Modal actions */}
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-black text-sm hover:border-gray-300 hover:bg-gray-50 transition-all">Cancel</button>
          <button onClick={handleSave} className="flex-1 py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all" style={{ background: `linear-gradient(135deg,${mm.accent},${mm.accent}cc)` }}>
            <FiSave size={14} />Save
          </button>
        </div>
      </Modal>

      {/* ══════════ TERM MODAL ══════════ */}
      <Modal open={showTermModal} onClose={() => setShowTermModal(false)} title={editTermId ? '✏️ Edit Term' : '+ Add New Term'} subtitle="Changes apply system-wide immediately" icon="📅" accentColor="#6366f1">
        <div><Lbl required>Term Name</Lbl><Inp value={termForm.term_name || ''} onChange={e => setTermForm({ ...termForm, term_name: e.target.value })} placeholder="e.g. Term 1, Term 2, Term 3" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl>Term Number</Lbl>
            <Sel value={termForm.term_number || ''} onChange={e => setTermForm({ ...termForm, term_number: e.target.value })}>
              <option value="">— Select —</option><option value="1">1 (First Term)</option><option value="2">2 (Second Term)</option><option value="3">3 (Third Term)</option>
            </Sel>
          </div>
          <div><Lbl required>Academic Year</Lbl><Inp type="number" value={termForm.academic_year || new Date().getFullYear()} onChange={e => setTermForm({ ...termForm, academic_year: e.target.value })} placeholder="2026" min={2020} max={2040} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Lbl required>Start Date</Lbl><Inp type="date" value={termForm.start_date || ''} onChange={e => setTermForm({ ...termForm, start_date: e.target.value })} /></div>
          <div><Lbl required>End Date</Lbl><Inp type="date" value={termForm.end_date || ''} onChange={e => setTermForm({ ...termForm, end_date: e.target.value })} /></div>
        </div>
        {/* Duration preview */}
        {termForm.start_date && termForm.end_date && (
          <div className="px-3 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl">
            <p className="text-[10px] font-black text-indigo-600">
              ⏱ Duration: {Math.ceil((new Date(termForm.end_date).getTime() - new Date(termForm.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
            </p>
          </div>
        )}
        <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${termForm.is_current ? 'border-indigo-300 bg-indigo-50' : 'border-gray-200 bg-gray-50'}`}
          onClick={() => setTermForm({ ...termForm, is_current: !termForm.is_current })}>
          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${termForm.is_current ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300 bg-white'}`}>
            {termForm.is_current && <span className="text-white text-xs font-black">✓</span>}
          </div>
          <div>
            <p className={`text-sm font-black ${termForm.is_current ? 'text-indigo-700' : 'text-gray-600'}`}>Set as Current / Active Term</p>
            <p className="text-[10px] text-gray-400">All other terms will be deactivated automatically</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button onClick={() => setShowTermModal(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-black text-sm hover:bg-gray-50 transition-all">Cancel</button>
          <button className="flex-1 py-3 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg"
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
            onClick={async () => {
              if (!termForm.term_name?.trim() || !termForm.start_date || !termForm.end_date || !termForm.academic_year) { toast.error('Please fill Term Name, Start Date, End Date and Academic Year'); return; }
              const payload = { term_name: termForm.term_name.trim(), term_number: termForm.term_number ? Number(termForm.term_number) : null, start_date: termForm.start_date, end_date: termForm.end_date, academic_year: Number(termForm.academic_year), is_current: !!termForm.is_current };
              if (termForm.is_current) { await supabase.from('school_terms').update({ is_current: false }).neq('id', editTermId ?? -1); }
              const { error } = editTermId ? await supabase.from('school_terms').update(payload).eq('id', editTermId) : await supabase.from('school_terms').insert([payload]);
              if (error) { toast.error(error.message); return; }
              toast.success(editTermId ? '✅ Term updated!' : '✅ Term added!'); setShowTermModal(false); fetchAll();
            }}>
            <FiSave size={14} />{editTermId ? 'Update Term' : 'Add Term'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

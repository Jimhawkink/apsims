'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiEdit2, FiTrash2, FiUsers } from 'react-icons/fi';
import UltraGrid from './UltraGrid';

export default function DepartmentsTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [f, setF] = useState<any>({ department_name: '', head_teacher_id: '', description: '' });
  const [editId, setEditId] = useState<number | null>(null);

  const save = async () => {
    if (!f.department_name) return toast.error('Department name required');
    if (editId) {
      await supabase.from('school_departments').update(f).eq('id', editId);
      toast.success('Updated');
    } else {
      await supabase.from('school_departments').insert([f]);
      toast.success('Created');
    }
    setShow(false); setEditId(null); setF({ department_name: '', head_teacher_id: '', description: '' }); d.fetchAll();
  };

  const edit = (r: any) => { setF({ department_name: r.department_name, head_teacher_id: r.head_teacher_id || '', description: r.description || '' }); setEditId(r.id); setShow(true); };
  const del = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_departments').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };

  // Count teachers per department
  const deptTeacherCount: Record<number, number> = {};
  d.teachers.forEach((t: any) => {
    if (t.departments) {
      (t.departments as string[]).forEach((dept: string) => {
        const deptObj = d.departments.find((dd: any) => dd.department_name === dept);
        if (deptObj) deptTeacherCount[deptObj.id] = (deptTeacherCount[deptObj.id] || 0) + 1;
      });
    }
  });

  const cols = [
    { key: 'department_name', label: 'Department', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{v}</span> },
    { key: 'head_teacher_id', label: 'HOD', color: '#065f46', bg: '#ecfdf5', render: (v: any) => <span className="font-semibold text-emerald-700">{d.getTeacherName(v)}</span> },
    { key: 'id', label: 'Teachers', color: '#92400e', bg: '#fffbeb', render: (v: any) => <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{deptTeacherCount[v] || 0}</span> },
    { key: 'description', label: 'Description', color: '#5b21b6', bg: '#f5f3ff', render: (v: any) => <span className="text-gray-500 text-xs">{v || '—'}</span> },
    { key: 'is_active', label: 'Active', color: '#166534', bg: '#f0fdf4', render: (v: any) => v ? <span className="text-green-600 font-bold text-[10px]">✓ Active</span> : <span className="text-gray-400 text-[10px]">Inactive</span> },
  ];
  const actions = [
    { label: 'Edit', icon: FiEdit2, color: '#1e40af', bg: '#eff6ff', onClick: edit },
    { label: 'Delete', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: del },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div><h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiUsers className="text-indigo-500" /> Departments</h3><p className="text-xs text-gray-400">{d.departments.length} departments</p></div>
        <button onClick={() => { setShow(!show); if (show) { setEditId(null); setF({ department_name: '', head_teacher_id: '', description: '' }); } }} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}><FiPlus size={13} /> {editId ? 'Update' : 'New Department'}</button>
      </div>
      {show && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><label className="lbl">Name *</label><input value={f.department_name} onChange={e => setF({ ...f, department_name: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">HOD</label><select value={f.head_teacher_id} onChange={e => setF({ ...f, head_teacher_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.teachers.map((t: any) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}</select></div>
            <div><label className="lbl">Description</label><input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
          </div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>{editId ? 'Update' : 'Create'} Department</button>
        </div>
      )}
      <UltraGrid columns={cols} data={d.departments} actions={actions} emptyMessage="No departments yet" />
    </div>
  );
}

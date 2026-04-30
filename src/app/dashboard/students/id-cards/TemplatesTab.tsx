'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiLayout, FiPlus, FiEdit2, FiTrash2, FiSave } from 'react-icons/fi';

export default function TemplatesTab({ data }: any) {
    const [editing, setEditing] = useState<any>(null);
    const [form, setForm] = useState({ template_name: '', card_type: 'Student', header_bg: '#1e40af', accent: '#3b82f6', photo_border: '#3b82f6' });

    const studentTemplates = data.templates.filter((t: any) => t.card_type === 'Student');
    const staffTemplates = data.templates.filter((t: any) => t.card_type === 'Staff');
    const otherTemplates = data.templates.filter((t: any) => !['Student', 'Staff'].includes(t.card_type));

    const save = async () => {
        if (!form.template_name) return toast.error('Name required');
        const payload = {
            template_name: form.template_name, card_type: form.card_type,
            template_code: editing ? undefined : `CUSTOM_${Date.now()}`,
            front_design: { header_bg: `linear-gradient(135deg, ${form.header_bg}, ${form.accent})`, accent: form.accent, photo_border: form.photo_border, header_text: '#ffffff', body_bg: '#ffffff' },
            is_active: true,
        };
        if (editing) {
            await supabase.from('school_id_card_templates').update(payload).eq('id', editing.id);
        } else {
            await supabase.from('school_id_card_templates').insert([payload]);
        }
        toast.success('Template saved');
        setEditing(null);
        setForm({ template_name: '', card_type: 'Student', header_bg: '#1e40af', accent: '#3b82f6', photo_border: '#3b82f6' });
        data.fetchAll();
    };

    const remove = async (id: number) => {
        if (!confirm('Delete this template?')) return;
        await supabase.from('school_id_card_templates').delete().eq('id', id);
        toast.success('Template deleted');
        data.fetchAll();
    };

    const startEdit = (t: any) => {
        setEditing(t);
        const design = t.front_design || {};
        setForm({
            template_name: t.template_name, card_type: t.card_type,
            header_bg: design.header_bg?.match(/#[0-9a-f]{6}/i)?.[0] || '#1e40af',
            accent: design.accent || '#3b82f6',
            photo_border: design.photo_border || '#3b82f6',
        });
    };

    const TemplateCard = ({ t }: { t: any }) => {
        const design = t.front_design || {};
        return (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="h-16" style={{ background: design.header_bg || 'linear-gradient(135deg, #1e40af, #3b82f6)' }} />
                <div className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-gray-800">{t.template_name}</p>
                        {t.is_default && <span className="text-[9px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Default</span>}
                    </div>
                    <div className="flex gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.card_type}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.orientation || 'landscape'}</span>
                        {t.is_active ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Active</span> : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Inactive</span>}
                    </div>
                    <div className="flex gap-1.5 pt-1">
                        <button onClick={() => startEdit(t)} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 flex items-center gap-1"><FiEdit2 size={10} /> Edit</button>
                        <button onClick={() => remove(t.id)} className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"><FiTrash2 size={10} /> Delete</button>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {/* Template Designer */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4">
                <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FiLayout className="text-purple-500" /> {editing ? 'Edit Template' : 'Create Template'}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div><label className="lbl">Name</label><input type="text" value={form.template_name} onChange={e => setForm({ ...form, template_name: e.target.value })} placeholder="e.g. Blue Classic" className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-lg text-sm focus:border-purple-400 outline-none" /></div>
                    <div><label className="lbl">Card Type</label><select value={form.card_type} onChange={e => setForm({ ...form, card_type: e.target.value })} className="select-modern w-full text-sm"><option value="Student">Student</option><option value="Staff">Staff</option><option value="Visitor">Visitor</option><option value="BusPass">Bus Pass</option></select></div>
                    <div><label className="lbl">Header Color</label><input type="color" value={form.header_bg} onChange={e => setForm({ ...form, header_bg: e.target.value })} className="w-full h-10 rounded-lg border-2 border-gray-200 cursor-pointer" /></div>
                    <div><label className="lbl">Accent Color</label><input type="color" value={form.accent} onChange={e => setForm({ ...form, accent: e.target.value, photo_border: e.target.value })} className="w-full h-10 rounded-lg border-2 border-gray-200 cursor-pointer" /></div>
                </div>
                <div className="flex gap-2 mt-3">
                    <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
                        <FiSave size={13} /> {editing ? 'Update' : 'Create'} Template
                    </button>
                    {editing && <button onClick={() => { setEditing(null); setForm({ template_name: '', card_type: 'Student', header_bg: '#1e40af', accent: '#3b82f6', photo_border: '#3b82f6' }); }} className="px-4 py-2 text-xs font-bold rounded-xl border-2 border-gray-200 text-gray-600">Cancel</button>}
                </div>
                {/* Live Preview */}
                <div className="mt-4 flex items-center gap-4">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preview:</p>
                    <div className="h-10 w-48 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: `linear-gradient(135deg, ${form.header_bg}, ${form.accent})` }}>
                        Header Preview
                    </div>
                    <div className="h-10 w-20 rounded-lg border-2 flex items-center justify-center text-white text-xs font-bold" style={{ borderColor: form.photo_border, background: form.accent }}>
                        Photo
                    </div>
                </div>
            </div>

            {/* Student Templates */}
            {studentTemplates.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Student Templates</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{studentTemplates.map((t: any) => <TemplateCard key={t.id} t={t} />)}</div>
                </div>
            )}
            {/* Staff Templates */}
            {staffTemplates.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Staff Templates</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{staffTemplates.map((t: any) => <TemplateCard key={t.id} t={t} />)}</div>
                </div>
            )}
            {/* Other Templates */}
            {otherTemplates.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Other Templates</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{otherTemplates.map((t: any) => <TemplateCard key={t.id} t={t} />)}</div>
                </div>
            )}
        </div>
    );
}

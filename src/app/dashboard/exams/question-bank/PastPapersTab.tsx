'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiBook, FiPlus, FiTrash2, FiDownload, FiUpload, FiEye } from 'react-icons/fi';

export default function PastPapersTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState<any>({ title: '', subject_id: '', form_id: '', year: new Date().getFullYear(), exam_type: 'KCSE', paper_number: 1, file_url: '', total_marks: 100, duration_minutes: 150, instructions: '', uploaded_by: 'Admin' });
  const [preview, setPreview] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const path = `past-papers/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('school-uploads').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('school-uploads').getPublicUrl(path);
      setF({ ...f, file_url: urlData.publicUrl });
      toast.success('File uploaded');
    } catch { toast.error('Upload failed'); }
    setUploading(false);
  };

  const save = async () => {
    if (!f.title || !f.subject_id || !f.year) return toast.error('Title, subject & year required');
    await supabase.from('school_past_papers').insert([f]);
    toast.success('Past paper added'); setShow(false); d.fetchAll();
  };

  const del = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_past_papers').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };
  const download = async (r: any) => { await supabase.from('school_past_papers').update({ downloads: (r.downloads || 0) + 1 }).eq('id', r.id); window.open(r.file_url, '_blank'); };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiBook className="text-blue-500" /> Past Papers</h3>
        <button onClick={() => setShow(!show)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}><FiPlus size={13} /> Add Paper</button>
      </div>

      {show && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="lbl">Title *</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Subject *</label><select value={f.subject_id} onChange={e => setF({ ...f, subject_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Form</label><select value={f.form_id} onChange={e => setF({ ...f, form_id: e.target.value })} className="select-modern w-full text-sm"><option value="">All</option>{d.forms.map((fm: any) => <option key={fm.id} value={fm.id}>Form {fm.form_level || fm.id}</option>)}</select></div>
            <div><label className="lbl">Year *</label><input type="number" value={f.year} onChange={e => setF({ ...f, year: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Exam Type</label><select value={f.exam_type} onChange={e => setF({ ...f, exam_type: e.target.value })} className="select-modern w-full text-sm"><option>KCSE</option><option>Mock</option><option>Mid-Term</option><option>End-Term</option><option>Opener</option></select></div>
            <div><label className="lbl">Paper #</label><input type="number" value={f.paper_number} onChange={e => setF({ ...f, paper_number: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Total Marks</label><input type="number" value={f.total_marks} onChange={e => setF({ ...f, total_marks: Number(e.target.value) })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div>
              <label className="lbl">Upload File</label>
              <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={handleUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:border-blue-400 flex items-center justify-center gap-2">
                <FiUpload size={13} /> {uploading ? 'Uploading...' : f.file_url ? '✓ Uploaded' : 'Choose file'}
              </button>
            </div>
          </div>
          <div><label className="lbl">Instructions</label><textarea rows={2} value={f.instructions} onChange={e => setF({ ...f, instructions: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
          <button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>Save Paper</button>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full" style={{ fontSize: 12 }}>
          <thead><tr>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">#</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">Title</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">Subject</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">Year</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">Type</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">Paper</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">Downloads</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-blue-50 text-blue-700">Actions</th>
          </tr></thead>
          <tbody>{d.pastPapers.map((p: any, i: number) => (
            <tr key={p.id} className="border-b border-gray-50 hover:bg-blue-50/30">
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2 font-bold text-gray-800">{p.title}</td>
              <td className="px-3 py-2 text-gray-600">{d.getSubjectName(p.subject_id)}</td>
              <td className="px-3 py-2 font-bold text-blue-600">{p.year}</td>
              <td className="px-3 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{p.exam_type}</span></td>
              <td className="px-3 py-2 text-center">Paper {p.paper_number}</td>
              <td className="px-3 py-2 text-center">{p.downloads || 0}</td>
              <td className="px-3 py-2"><div className="flex gap-1"><button onClick={() => setPreview(p)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><FiEye size={12}/></button><button onClick={() => download(p)} className="p-1.5 rounded-lg bg-green-50 text-green-600"><FiDownload size={12}/></button><button onClick={() => del(p.id)} className="p-1.5 rounded-lg bg-red-50 text-red-600"><FiTrash2 size={12}/></button></div></td>
            </tr>
          ))}</tbody>
        </table>
        {d.pastPapers.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No past papers uploaded yet</p>}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between"><h3 className="text-sm font-bold text-gray-800">{preview.title}</h3><button onClick={() => setPreview(null)} className="text-gray-400">✕</button></div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Subject:</span> <span className="font-semibold">{d.getSubjectName(preview.subject_id)}</span></div>
              <div><span className="text-gray-400">Year:</span> <span className="font-semibold">{preview.year}</span></div>
              <div><span className="text-gray-400">Type:</span> <span className="font-semibold">{preview.exam_type}</span></div>
              <div><span className="text-gray-400">Paper:</span> <span className="font-semibold">{preview.paper_number}</span></div>
              <div><span className="text-gray-400">Marks:</span> <span className="font-semibold">{preview.total_marks}</span></div>
              <div><span className="text-gray-400">Duration:</span> <span className="font-semibold">{preview.duration_minutes} min</span></div>
            </div>
            {preview.instructions && <p className="text-xs text-gray-500 border-t pt-2">{preview.instructions}</p>}
            <button onClick={() => download(preview)} className="w-full px-3 py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}><FiDownload size={12} /> Download</button>
          </div>
        </div>
      )}
    </div>
  );
}

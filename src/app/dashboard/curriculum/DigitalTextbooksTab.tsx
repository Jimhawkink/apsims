'use client';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiDownload, FiBook, FiCheck, FiX, FiUpload, FiFile, FiEye } from 'react-icons/fi';
import UltraGrid from './UltraGrid';

const FILE_COLORS: Record<string, { color: string; bg: string }> = {
  PDF: { color: '#b91c1c', bg: '#fef2f2' },
  EPUB: { color: '#1e40af', bg: '#eff6ff' },
  DOCX: { color: '#065f46', bg: '#ecfdf5' },
  PPTX: { color: '#b45309', bg: '#fffbeb' },
  ZIP: { color: '#5b21b6', bg: '#f5f3ff' },
  Other: { color: '#6b7280', bg: '#f3f4f6' },
};

export default function DigitalTextbooksTab({ d }: any) {
  const [show, setShow] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [f, setF] = useState<any>({ title: '', author: '', publisher: '', edition: '', isbn: '', subject_id: '', form_id: '', file_url: '', file_type: 'PDF', file_size_mb: 0, cover_image_url: '', description: '', uploaded_by: 'Admin' });
  const [previewBook, setPreviewBook] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'Other';
      const path = `textbooks/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('school-uploads').upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('school-uploads').getPublicUrl(path);
      setF({ ...f, file_url: urlData.publicUrl, file_type: FILE_COLORS[ext] ? ext : 'Other', file_size_mb: Number((file.size / 1024 / 1024).toFixed(2)) });
      toast.success('File uploaded');
    } catch { toast.error('Upload failed — check storage bucket'); }
    setUploading(false);
  };

  const save = async () => {
    if (!f.title || !f.file_url) return toast.error('Title & file required');
    await supabase.from('school_digital_textbooks').insert([f]);
    toast.success('Textbook added'); setShow(false); d.fetchAll();
  };

  const del = async (id: number) => { if (!confirm('Delete?')) return; await supabase.from('school_digital_textbooks').delete().eq('id', id); toast.success('Deleted'); d.fetchAll(); };
  const approve = async (r: any) => { await supabase.from('school_digital_textbooks').update({ is_approved: true, approved_by: 'Admin' }).eq('id', r.id); toast.success('Approved'); d.fetchAll(); };
  const reject = async (r: any) => { await supabase.from('school_digital_textbooks').update({ is_approved: false }).eq('id', r.id); toast.success('Rejected'); d.fetchAll(); };
  const incrementDownload = async (r: any) => { await supabase.from('school_digital_textbooks').update({ downloads: (r.downloads || 0) + 1 }).eq('id', r.id); window.open(r.file_url, '_blank'); };

  const totalBooks = d.digitalTextbooks.length;
  const totalMB = d.digitalTextbooks.reduce((s: number, b: any) => s + Number(b.file_size_mb || 0), 0).toFixed(1);
  const approved = d.digitalTextbooks.filter((b: any) => b.is_approved).length;

  const cols = [
    { key: 'title', label: 'Title', color: '#1e40af', bg: '#eff6ff', render: (v: any) => <span className="font-bold text-indigo-700">{v}</span> },
    { key: 'author', label: 'Author', color: '#065f46', bg: '#ecfdf5', render: (v: any) => <span className="text-gray-600">{v || '—'}</span> },
    { key: 'publisher', label: 'Publisher', color: '#92400e', bg: '#fffbeb', render: (v: any) => v || '—' },
    { key: 'subject_id', label: 'Subject', color: '#5b21b6', bg: '#f5f3ff', render: (v: any) => d.getSubjectName(v) },
    { key: 'form_id', label: 'Form', color: '#155e75', bg: '#ecfeff', render: (v: any) => v ? d.getFormName(v) : 'All' },
    { key: 'file_type', label: 'Type', color: '#991b1b', bg: '#fef2f2', render: (v: any) => { const fc = FILE_COLORS[v] || FILE_COLORS.Other; return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ color: fc.color, backgroundColor: fc.bg }}>{v}</span>; } },
    { key: 'file_size_mb', label: 'Size', color: '#166534', bg: '#f0fdf4', render: (v: any) => <span className="text-xs">{v ? `${v} MB` : '—'}</span> },
    { key: 'is_approved', label: 'Approved', color: '#6b21a8', bg: '#faf5ff', render: (v: any) => v ? <span className="text-green-600 font-bold text-[10px]">✓ Approved</span> : <span className="text-amber-600 text-[10px]">⏳ Pending</span> },
    { key: 'downloads', label: 'Downloads', color: '#1e40af', bg: '#eff6ff' },
  ];
  const actions = [
    { label: 'View', icon: FiEye, color: '#1e40af', bg: '#eff6ff', onClick: (r: any) => setPreviewBook(r) },
    { label: 'Download', icon: FiDownload, color: '#059669', bg: '#ecfdf5', onClick: incrementDownload },
    { label: 'Approve', icon: FiCheck, color: '#15803d', bg: '#f0fdf4', onClick: approve, show: (r: any) => !r.is_approved },
    { label: 'Reject', icon: FiX, color: '#b91c1c', bg: '#fef2f2', onClick: reject, show: (r: any) => r.is_approved },
    { label: 'Delete', icon: FiTrash2, color: '#b91c1c', bg: '#fef2f2', onClick: del },
  ];

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{totalBooks}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Total Books</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{approved}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">Approved</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{totalMB}</p>
          <p className="text-[10px] font-bold text-gray-400 uppercase">MB Stored</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiBook className="text-indigo-500" /> Digital Textbooks</h3>
        <button onClick={() => setShow(!show)} className="px-4 py-2 text-xs font-bold text-white rounded-xl flex items-center gap-1.5 shadow-md" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}><FiPlus size={13} /> Upload Textbook</button>
      </div>

      {show && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><label className="lbl">Title *</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Author</label><input value={f.author} onChange={e => setF({ ...f, author: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Publisher</label><input value={f.publisher} onChange={e => setF({ ...f, publisher: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Edition</label><input value={f.edition} onChange={e => setF({ ...f, edition: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">ISBN</label><input value={f.isbn} onChange={e => setF({ ...f, isbn: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
            <div><label className="lbl">Subject</label><select value={f.subject_id} onChange={e => setF({ ...f, subject_id: e.target.value })} className="select-modern w-full text-sm"><option value="">Select...</option>{d.subjects.map((s: any) => <option key={s.id} value={s.id}>{s.subject_name}</option>)}</select></div>
            <div><label className="lbl">Form</label><select value={f.form_id} onChange={e => setF({ ...f, form_id: e.target.value })} className="select-modern w-full text-sm"><option value="">All Forms</option>{d.forms.map((fm: any) => <option key={fm.id} value={fm.id}>Form {fm.form_number || fm.id}</option>)}</select></div>
            <div>
              <label className="lbl">Upload File *</label>
              <input ref={fileRef} type="file" accept=".pdf,.epub,.docx,.pptx,.zip" onChange={handleFileUpload} className="hidden" />
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                <FiUpload size={13} /> {uploading ? 'Uploading...' : f.file_url ? '✓ File uploaded' : 'Choose file (PDF, EPUB, DOCX)'}
              </button>
            </div>
          </div>
          <div><label className="lbl">Description</label><textarea rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-400 outline-none" /></div>
          <button onClick={save} disabled={!f.file_url} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#1e40af,#3b82f6)' }}>Save Textbook</button>
        </div>
      )}

      <UltraGrid columns={cols} data={d.digitalTextbooks} actions={actions} emptyMessage="No digital textbooks uploaded yet" />

      {/* Preview Modal */}
      {previewBook && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPreviewBook(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full space-y-3" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2"><FiBook className="text-indigo-500" /> {previewBook.title}</h3>
              <button onClick={() => setPreviewBook(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div><span className="text-gray-400">Author:</span> <span className="font-semibold">{previewBook.author || '—'}</span></div>
              <div><span className="text-gray-400">Publisher:</span> <span className="font-semibold">{previewBook.publisher || '—'}</span></div>
              <div><span className="text-gray-400">Subject:</span> <span className="font-semibold">{d.getSubjectName(previewBook.subject_id)}</span></div>
              <div><span className="text-gray-400">Form:</span> <span className="font-semibold">{previewBook.form_id ? d.getFormName(previewBook.form_id) : 'All'}</span></div>
              <div><span className="text-gray-400">File:</span> <span className="font-semibold">{previewBook.file_type} · {previewBook.file_size_mb} MB</span></div>
              <div><span className="text-gray-400">ISBN:</span> <span className="font-semibold">{previewBook.isbn || '—'}</span></div>
              <div><span className="text-gray-400">Downloads:</span> <span className="font-semibold">{previewBook.downloads || 0}</span></div>
              <div><span className="text-gray-400">Status:</span> <span className={`font-semibold ${previewBook.is_approved ? 'text-green-600' : 'text-amber-600'}`}>{previewBook.is_approved ? 'Approved' : 'Pending'}</span></div>
            </div>
            {previewBook.description && <p className="text-xs text-gray-500 border-t pt-2">{previewBook.description}</p>}
            <div className="flex gap-2">
              <button onClick={() => incrementDownload(previewBook)} className="flex-1 px-3 py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}><FiDownload size={12} /> Download</button>
              {!previewBook.is_approved && <button onClick={() => { approve(previewBook); setPreviewBook(null); }} className="flex-1 px-3 py-2 text-xs font-bold text-white rounded-xl flex items-center justify-center gap-1" style={{ background: 'linear-gradient(135deg,#15803d,#22c55e)' }}><FiCheck size={12} /> Approve</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

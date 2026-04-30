'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCopy, FiCheck, FiX } from 'react-icons/fi';

export default function DuplicatesTab({ d }: any) {
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);

  const scan = () => {
    setScanning(true);
    const seen: Record<string, any[]> = {};
    d.questions.forEach((q: any) => {
      const key = `${q.subject_id}_${q.question_text?.trim().toLowerCase()}_${q.question_type}`;
      if (!seen[key]) seen[key] = [];
      seen[key].push(q);
    });
    const dups = Object.values(seen).filter(arr => arr.length > 1);
    setDuplicates(dups);
    setScanning(false);
    toast.success(`Found ${dups.length} duplicate groups`);
  };

  const markDuplicate = async (keepId: number, removeIds: number[]) => {
    for (const id of removeIds) {
      await supabase.from('school_question_bank').update({ is_duplicate: true, duplicate_of: keepId }).eq('id', id);
    }
    toast.success(`Marked ${removeIds.length} as duplicates`);
    d.fetchAll();
    scan();
  };

  const deleteDuplicates = async (ids: number[]) => {
    if (!confirm(`Delete ${ids.length} duplicate questions?`)) return;
    for (const id of ids) {
      await supabase.from('school_question_bank').delete().eq('id', id);
    }
    toast.success('Duplicates deleted');
    d.fetchAll();
    scan();
  };

  const alreadyFlagged = d.questions.filter((q: any) => q.is_duplicate);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiCopy className="text-gray-500" /> Duplicate Detection</h3>
        <button onClick={scan} disabled={scanning} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#6b7280,#9ca3af)' }}>
          {scanning ? 'Scanning...' : 'Scan for Duplicates'}
        </button>
      </div>

      {alreadyFlagged.length > 0 && (
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3">
          <p className="text-xs font-bold text-yellow-700 mb-1">{alreadyFlagged.length} questions already flagged as duplicates</p>
          <button onClick={async () => { if (!confirm(`Delete ${alreadyFlagged.length} flagged duplicates?`)) return; for (const q of alreadyFlagged) await supabase.from('school_question_bank').delete().eq('id', q.id); toast.success('Deleted'); d.fetchAll(); }} className="text-[10px] font-bold text-red-600 underline">Delete all flagged</button>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="space-y-3">
          {duplicates.map((group: any[], gi: number) => (
            <div key={gi} className="bg-white rounded-2xl border-2 border-orange-200 p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-orange-700">Group {gi + 1} — {group.length} duplicates</span>
                <div className="flex gap-1">
                  <button onClick={() => deleteDuplicates(group.slice(1).map((q: any) => q.id))} className="px-3 py-1 text-[10px] font-bold text-white rounded-lg bg-red-500">Delete extras</button>
                </div>
              </div>
              {group.map((q: any, qi: number) => (
                <div key={q.id} className={`p-2 rounded-lg text-xs ${qi === 0 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <div className="flex justify-between">
                    <span className="font-bold text-gray-800 flex-1 mr-2">{q.question_text}</span>
                    <div className="flex gap-1">
                      {qi === 0 && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">Keep</span>}
                      {qi > 0 && <button onClick={() => markDuplicate(group[0].id, [q.id])} className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">Mark dup</button>}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-1 text-[10px] text-gray-500">
                    <span>{d.getSubjectName(q.subject_id)}</span>
                    <span>{q.question_type}</span>
                    <span>{q.difficulty}</span>
                    <span>ID: {q.id}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {duplicates.length === 0 && !scanning && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <FiCopy size={30} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Click "Scan for Duplicates" to detect duplicate questions</p>
        </div>
      )}
    </div>
  );
}

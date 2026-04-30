'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiCheck, FiEdit2, FiEye } from 'react-icons/fi';

export default function MarkingSchemesTab({ d }: any) {
  const [viewQ, setViewQ] = useState<any>(null);
  const [editId, setEditId] = useState<number|null>(null);
  const [ms, setMs] = useState('');
  const [calcSteps, setCalcSteps] = useState('');
  const [essayPts, setEssayPts] = useState<string[]>([]);
  const [newPt, setNewPt] = useState('');

  const needsMarking = d.questions.filter((q: any) => q.question_type === 'essay' || q.question_type === 'calculation' || q.question_type === 'short_answer');

  const openEdit = (q: any) => {
    setEditId(q.id); setMs(q.marking_scheme || ''); setCalcSteps(q.calculation_steps || '');
    setEssayPts(q.essay_marking_points || []);
  };

  const save = async () => {
    await supabase.from('school_question_bank').update({ marking_scheme: ms, calculation_steps: calcSteps, essay_marking_points: essayPts.length ? essayPts : null }).eq('id', editId);
    toast.success('Marking scheme saved'); setEditId(null); d.fetchAll();
  };

  const addPt = () => { if (newPt.trim()) { setEssayPts([...essayPts, newPt.trim()]); setNewPt(''); } };
  const rmPt = (i: number) => setEssayPts(essayPts.filter((_: string, idx: number) => idx !== i));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2"><FiCheck className="text-green-500" /> Marking Scheme Builder</h3>
        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-bold">{needsMarking.length} questions need marking schemes</span>
      </div>

      {viewQ && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
          <div className="flex justify-between"><h4 className="text-sm font-bold text-gray-800">{viewQ.question_text}</h4><button onClick={() => setViewQ(null)} className="text-gray-400 hover:text-gray-600">✕</button></div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-gray-400">Subject:</span> <span className="font-semibold">{d.getSubjectName(viewQ.subject_id)}</span></div>
            <div><span className="text-gray-400">Type:</span> <span className="font-semibold">{viewQ.question_type}</span></div>
            <div><span className="text-gray-400">Marks:</span> <span className="font-semibold">{viewQ.marks}</span></div>
            <div><span className="text-gray-400">Correct:</span> <span className="font-semibold">{viewQ.correct_answer || '—'}</span></div>
          </div>
          {viewQ.marking_scheme && <div className="border-t pt-2"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Marking Scheme</p><p className="text-xs text-gray-600 whitespace-pre-wrap">{viewQ.marking_scheme}</p></div>}
          {viewQ.calculation_steps && <div className="border-t pt-2"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Calculation Steps</p><p className="text-xs text-gray-600 whitespace-pre-wrap">{viewQ.calculation_steps}</p></div>}
          {viewQ.essay_marking_points?.length > 0 && <div className="border-t pt-2"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Essay Marking Points</p><ul className="text-xs text-gray-600 space-y-0.5">{viewQ.essay_marking_points.map((p: string, i: number) => <li key={i}>• {p}</li>)}</ul></div>}
          {viewQ.ai_explanation && <div className="border-t pt-2"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">AI Explanation</p><p className="text-xs text-purple-600">{viewQ.ai_explanation}</p></div>}
          {viewQ.distractor_analysis && <div className="border-t pt-2"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Distractor Analysis</p><div className="grid grid-cols-2 gap-1 text-xs">{Object.entries(viewQ.distractor_analysis).map(([k, v]: [string, any]) => <div key={k} className={`px-2 py-1 rounded ${v.correct ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}><span className="font-bold">{k}:</span> {v.correct ? '✓ Correct' : v.distractor || v.reason}</div>)}</div></div>}
        </div>
      )}

      {editId && (
        <div className="bg-white rounded-2xl border-2 border-green-200 p-5 space-y-3">
          <h4 className="text-sm font-bold text-green-700">Edit Marking Scheme</h4>
          <div><label className="lbl">Marking Scheme</label><textarea rows={5} value={ms} onChange={e => setMs(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-green-400 outline-none" placeholder="Full marking guide with mark allocation..." /></div>
          <div><label className="lbl">Step-by-Step Calculation</label><textarea rows={4} value={calcSteps} onChange={e => setCalcSteps(e.target.value)} className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-green-400 outline-none" placeholder="Step 1: ...&#10;Step 2: ..." /></div>
          <div>
            <label className="lbl">Essay Marking Points</label>
            <div className="space-y-1 mb-2">{essayPts.map((p: string, i: number) => <div key={i} className="flex items-center gap-2"><span className="text-xs text-gray-600 flex-1">• {p}</span><button onClick={() => rmPt(i)} className="text-red-400 text-xs">✕</button></div>)}</div>
            <div className="flex gap-2"><input value={newPt} onChange={e => setNewPt(e.target.value)} className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-green-400 outline-none" placeholder="Add marking point..." onKeyDown={e => e.key === 'Enter' && addPt()} /><button onClick={addPt} className="px-3 py-2 text-xs font-bold text-white rounded-lg" style={{ background: '#059669' }}>Add</button></div>
          </div>
          <div className="flex gap-2"><button onClick={save} className="px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md" style={{ background: 'linear-gradient(135deg,#059669,#10b981)' }}>Save Scheme</button><button onClick={() => setEditId(null)} className="px-4 py-2 text-xs font-bold text-gray-500 rounded-xl border">Cancel</button></div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full" style={{ fontSize: 12 }}>
          <thead><tr>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-gray-50 text-gray-500">#</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-gray-50 text-gray-500">Question</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-gray-50 text-gray-500">Type</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-gray-50 text-gray-500">Subject</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-gray-50 text-gray-500">Scheme</th>
            <th className="text-left px-3 py-2 text-[10px] font-bold uppercase bg-gray-50 text-gray-500">Actions</th>
          </tr></thead>
          <tbody>{needsMarking.map((q: any, i: number) => (
            <tr key={q.id} className="border-b border-gray-50 hover:bg-gray-50">
              <td className="px-3 py-2 text-gray-400">{i + 1}</td>
              <td className="px-3 py-2 text-gray-800 max-w-[250px] truncate">{q.question_text}</td>
              <td className="px-3 py-2"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{q.question_type}</span></td>
              <td className="px-3 py-2 text-gray-600">{d.getSubjectName(q.subject_id)}</td>
              <td className="px-3 py-2">{q.marking_scheme ? <span className="text-green-600 text-[10px] font-bold">✓ Has scheme</span> : <span className="text-amber-600 text-[10px]">⚠ Missing</span>}</td>
              <td className="px-3 py-2"><div className="flex gap-1"><button onClick={() => setViewQ(q)} className="p-1.5 rounded-lg bg-blue-50 text-blue-600"><FiEye size={12}/></button><button onClick={() => openEdit(q)} className="p-1.5 rounded-lg bg-green-50 text-green-600"><FiEdit2 size={12}/></button></div></td>
            </tr>
          ))}</tbody>
        </table>
        {needsMarking.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No essay/calculation questions found</p>}
      </div>
    </div>
  );
}

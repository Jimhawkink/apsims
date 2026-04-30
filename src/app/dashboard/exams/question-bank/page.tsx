'use client';
import { useState } from 'react';
import { FiFileText, FiCpu, FiCheck, FiBook, FiEdit2, FiBarChart2, FiCopy } from 'react-icons/fi';
import { useQuestionBankData } from './useQuestionBankData';
import AIGenTab from './AIGenTab';
import MarkingSchemesTab from './MarkingSchemesTab';
import PastPapersTab from './PastPapersTab';
import StudentPracticeTab from './StudentPracticeTab';
import KCSEAnalysisTab from './KCSEAnalysisTab';
import ApprovalTab from './ApprovalTab';
import StatsTab from './StatsTab';
import DuplicatesTab from './DuplicatesTab';
import QuestionsTab from './QuestionsTab';

type Tab = 'questions'|'ai'|'marking'|'papers'|'practice'|'kcse'|'approval'|'stats'|'duplicates';
const TABS: {id:Tab;label:string;icon:any;color:string}[] = [
  {id:'questions',label:'Questions',icon:FiFileText,color:'#6366f1'},
  {id:'ai',label:'AI Generator',icon:FiCpu,color:'#7c3aed'},
  {id:'marking',label:'Marking Schemes',icon:FiCheck,color:'#059669'},
  {id:'papers',label:'Past Papers',icon:FiBook,color:'#1e40af'},
  {id:'practice',label:'Student Practice',icon:FiEdit2,color:'#b45309'},
  {id:'kcse',label:'KCSE Analysis',icon:FiBarChart2,color:'#991b1b'},
  {id:'approval',label:'Approvals',icon:FiCheck,color:'#15803d'},
  {id:'stats',label:'Statistics',icon:FiBarChart2,color:'#155e75'},
  {id:'duplicates',label:'Duplicates',icon:FiCopy,color:'#6b7280'},
];

export default function QuestionBankPage() {
  const d = useQuestionBankData();
  const [tab, setTab] = useState<Tab>('questions');

  if (d.loading) return <div className="flex items-center justify-center h-64"><div className="w-10 h-10 border-3 border-gray-200 border-t-indigo-500 rounded-full animate-spin" style={{borderWidth:3}}/></div>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2"><FiFileText className="text-indigo-500"/> Ultra Question Bank</h1><p className="text-sm text-gray-500 mt-1">AI · Marking Schemes · KCSE Analysis · Practice</p></div>
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">{d.questions.length} Questions</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold">{d.questions.filter((q:any)=>q.source==='ai_generated').length} AI</span>
          <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold">{d.questions.filter((q:any)=>q.approval_status==='pending').length} Pending</span>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-gray-200 p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(t => { const Icon = t.icon; const active = tab === t.id; return (
          <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${active ? 'text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`} style={active ? {background:`linear-gradient(135deg,${t.color},${t.color}cc)`} : {}}><Icon size={14}/> {t.label}</button>
        ); })}
      </div>
      {tab === 'questions' && <QuestionsTab d={d} />}
      {tab === 'ai' && <AIGenTab d={d} />}
      {tab === 'marking' && <MarkingSchemesTab d={d} />}
      {tab === 'papers' && <PastPapersTab d={d} />}
      {tab === 'practice' && <StudentPracticeTab d={d} />}
      {tab === 'kcse' && <KCSEAnalysisTab d={d} />}
      {tab === 'approval' && <ApprovalTab d={d} />}
      {tab === 'stats' && <StatsTab d={d} />}
      {tab === 'duplicates' && <DuplicatesTab d={d} />}
    </div>
  );
}

'use client';
import { useState, useEffect, useCallback } from 'react';
import { FiSend, FiBarChart2, FiFileText, FiClock, FiRefreshCw } from 'react-icons/fi';
import { supabase } from '@/lib/supabase';
import SendTab from './SendTab';
import StatusTab from './StatusTab';
import TemplatesTab from './TemplatesTab';
import HistoryTab from './HistoryTab';

type Tab = 'send' | 'status' | 'templates' | 'history';

interface Term { id: number; term_name: string; academic_year: string; }
interface Form { id: number; form_name: string; }
interface Stream { id: number; stream_name: string; form_id: number; }
interface Student { id: number; first_name: string; last_name: string; admission_number: string; }

const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'send', label: 'Send Reports', icon: FiSend },
  { id: 'status', label: 'Delivery Status', icon: FiBarChart2 },
  { id: 'templates', label: 'Templates', icon: FiFileText },
  { id: 'history', label: 'Message History', icon: FiClock },
];

export default function WhatsAppReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('send');
  const [terms, setTerms] = useState<Term[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [termsRes, formsRes, streamsRes, studentsRes] = await Promise.all([
        supabase.from('school_terms').select('id, term_name, academic_year').order('created_at', { ascending: false }),
        supabase.from('school_forms').select('id, form_name').order('form_name'),
        supabase.from('school_streams').select('id, stream_name, form_id').order('stream_name'),
        supabase.from('school_students').select('id, first_name, last_name, admission_number').eq('status', 'Active').order('first_name').limit(2000),
      ]);
      if (termsRes.data) setTerms(termsRes.data);
      if (formsRes.data) setForms(formsRes.data);
      if (streamsRes.data) setStreams(streamsRes.data);
      if (studentsRes.data) setStudents(studentsRes.data);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="p-4 lg:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
          {/* WhatsApp icon */}
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">WhatsApp Report Delivery</h1>
          <p className="text-sm text-gray-500">Send report cards and notifications to parents via WhatsApp</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <FiRefreshCw size={28} className="animate-spin text-green-400 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading data...</p>
          </div>
        </div>
      ) : (
        <>
          {activeTab === 'send' && <SendTab terms={terms} forms={forms} streams={streams} />}
          {activeTab === 'status' && <StatusTab terms={terms} forms={forms} />}
          {activeTab === 'templates' && <TemplatesTab />}
          {activeTab === 'history' && <HistoryTab students={students} />}
        </>
      )}
    </div>
  );
}

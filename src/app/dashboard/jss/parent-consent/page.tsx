'use client';
import { useEffect, useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FiCheckCircle, FiAlertTriangle, FiMessageSquare, FiRefreshCw, FiUserCheck, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

const sb = createClientComponentClient();

interface Transition {
  id: number;
  student_id: number;
  pathway: string;
  recommended_school: string | null;
  parent_consent: boolean;
  consent_date: string | null;
  notes: string | null;
  created_at: string;
  student?: { id: number; first_name: string; last_name: string; admission_number: string; guardian_name: string; guardian_phone: string; form_id: number };
}

export default function ParentConsentPage() {
  const [transitions, setTransitions] = useState<Transition[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'consented'>('pending');
  const [sending, setSending] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await sb
      .from('school_pathway_transitions')
      .select('*, student:student_id(id, first_name, last_name, admission_number, guardian_name, guardian_phone, form_id)')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setTransitions(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const markConsented = async (t: Transition) => {
    setSaving(t.id);
    const { error } = await sb.from('school_pathway_transitions').update({
      parent_consent: true,
      consent_date: new Date().toISOString().split('T')[0],
    }).eq('id', t.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Consent recorded for ${t.student?.first_name} ${t.student?.last_name}`);
      setTransitions(prev => prev.map(x => x.id === t.id ? { ...x, parent_consent: true, consent_date: new Date().toISOString().split('T')[0] } : x));
    }
    setSaving(null);
  };

  const revokeConsent = async (t: Transition) => {
    setSaving(t.id);
    const { error } = await sb.from('school_pathway_transitions').update({ parent_consent: false, consent_date: null }).eq('id', t.id);
    if (error) toast.error(error.message);
    else {
      toast.success('Consent revoked');
      setTransitions(prev => prev.map(x => x.id === t.id ? { ...x, parent_consent: false, consent_date: null } : x));
    }
    setSaving(null);
  };

  const sendSMSReminder = async (t: Transition) => {
    if (!t.student?.guardian_phone) { toast.error('No guardian phone number on record'); return; }
    setSending(t.id);
    try {
      const res = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: t.student.guardian_phone,
          message: `Dear ${t.student.guardian_name || 'Parent/Guardian'}, your child ${t.student.first_name} ${t.student.last_name} has been recommended for the ${t.pathway} pathway. Please visit the school to provide consent. Contact us: APSIMS School.`
        })
      });
      if (res.ok) toast.success('SMS reminder sent to ' + t.student.guardian_phone);
      else toast.error('SMS failed to send');
    } catch { toast.error('SMS service unavailable'); }
    setSending(null);
  };

  const filtered = transitions.filter(t => {
    const matchFilter = filter === 'all' ? true : filter === 'pending' ? !t.parent_consent : t.parent_consent;
    const q = search.toLowerCase();
    const name = `${t.student?.first_name || ''} ${t.student?.last_name || ''}`.toLowerCase();
    const adm = (t.student?.admission_number || '').toLowerCase();
    const matchSearch = !q || name.includes(q) || adm.includes(q) || (t.pathway || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const pendingCount = transitions.filter(t => !t.parent_consent).length;
  const consentedCount = transitions.filter(t => t.parent_consent).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl p-6 text-white" style={{ background: 'linear-gradient(135deg,#1e3a8a,#0d9488)' }}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl">📋</div>
          <div>
            <h1 className="text-2xl font-black">JSS Parent Consent Portal</h1>
            <p className="text-sm text-white/70 mt-1">Track and manage parent/guardian consent for JSS pathway transitions · CBC Grade 9</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {[
            { l: 'Total Students', v: transitions.length, c: '#93c5fd' },
            { l: 'Pending Consent', v: pendingCount, c: '#fde68a', urgent: pendingCount > 0 },
            { l: 'Consented', v: consentedCount, c: '#86efac' },
          ].map(k => (
            <div key={k.l} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-3xl font-black" style={{ color: k.c }}>{k.v}</p>
              <p className="text-[11px] text-white/60 font-bold uppercase mt-1">{k.l}</p>
              {k.urgent && <p className="text-[10px] text-amber-300 font-bold mt-1">⚠️ Action required</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, admission no, pathway..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400" />
        </div>
        <div className="flex border border-gray-200 rounded-xl overflow-hidden">
          {[['all','All'], ['pending','⚠️ Pending'], ['consented','✅ Consented']] .map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v as any)}
              className={'px-4 py-2 text-xs font-bold transition ' + (filter===v ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50')}>
              {l}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="p-2.5 rounded-xl border border-gray-200 text-gray-400 hover:text-blue-600">
          <FiRefreshCw size={15} />
        </button>
        <p className="text-xs text-gray-400 font-semibold ml-auto">{filtered.length} of {transitions.length} students</p>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Loading consent records...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
          <p className="text-4xl mb-3">✅</p>
          <p className="font-bold text-gray-600">{filter === 'pending' ? 'All parents have provided consent!' : 'No records match your search'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Student','Adm No','Guardian','Phone','Pathway','Status','Consent Date','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(t => (
                <tr key={t.id} className={'hover:bg-gray-50/80 transition ' + (!t.parent_consent ? 'bg-amber-50/30' : '')}>
                  <td className="px-4 py-3">
                    <p className="font-bold text-gray-800">{t.student?.first_name} {t.student?.last_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{t.student?.admission_number}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.student?.guardian_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">{t.student?.guardian_phone || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700">{t.pathway}</span>
                  </td>
                  <td className="px-4 py-3">
                    {t.parent_consent ? (
                      <span className="flex items-center gap-1 text-[11px] font-black text-green-600">
                        <FiCheckCircle size={12} /> Consented
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-black text-amber-600">
                        <FiAlertTriangle size={12} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {t.consent_date ? new Date(t.consent_date).toLocaleDateString('en-KE') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {!t.parent_consent ? (
                        <button onClick={() => markConsented(t)} disabled={saving === t.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-black text-white"
                          style={{ background: 'linear-gradient(135deg,#059669,#0d9488)' }}>
                          {saving === t.id ? <FiRefreshCw size={10} className="animate-spin" /> : <FiUserCheck size={10} />}
                          Mark Consented
                        </button>
                      ) : (
                        <button onClick={() => revokeConsent(t)} disabled={saving === t.id}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100">
                          Revoke
                        </button>
                      )}
                      <button onClick={() => sendSMSReminder(t)} disabled={sending === t.id}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100">
                        {sending === t.id ? <FiRefreshCw size={10} className="animate-spin" /> : <FiMessageSquare size={10} />}
                        SMS
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info note */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-xs font-bold text-blue-700 mb-1">📋 About Parent Consent</p>
        <p className="text-[11px] text-blue-600">Under CBC JSS guidelines, parents/guardians must provide written consent before a learner is transitioned to their recommended Senior Secondary pathway. Use the <strong>Mark Consented</strong> button after physical consent is obtained, or <strong>SMS</strong> to send a reminder to the guardian&apos;s phone number on record.</p>
      </div>
    </div>
  );
}

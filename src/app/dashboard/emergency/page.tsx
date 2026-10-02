'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiAlertTriangle, FiPlus, FiX, FiCheck, FiRefreshCw, FiSend, FiUsers, FiClock } from 'react-icons/fi';

const ALERT_TYPES = [
  { name: 'School Closure', emoji: '🚫', color: '#dc2626', bg: '#fef2f2', template: 'Dear Parent, school will be closed on {date} due to {reason}. School reopens on {reopen_date}. — Management' },
  { name: 'Security Incident', emoji: '🛡️', color: '#dc2626', bg: '#fef2f2', template: 'URGENT: A security incident has occurred at the school. Students are safe. Further details to follow. — Principal' },
  { name: 'Emergency', emoji: '🆘', color: '#dc2626', bg: '#fef2f2', template: 'URGENT NOTICE: {message}. Please contact the school immediately. — {school_name} Management' },
  { name: 'Fee Reminder', emoji: '💳', color: '#d97706', bg: '#fffbeb', template: 'Dear Parent of {student_name}, your fee balance of KES {amount} is due by {date}. Pay via M-Pesa {paybill}. Ref: {admission_no}. — Bursar' },
  { name: 'Event Notice', emoji: '📅', color: '#2563eb', bg: '#eff6ff', template: 'Dear Parent, {event_name} will be held on {date} at {time}. All students are required to attend. — School Admin' },
  { name: 'Exam Alert', emoji: '📝', color: '#7c3aed', bg: '#f5f3ff', template: 'Dear Parent, {exam_name} begins on {date}. Ensure {student_name} comes with all required items: pen, ruler, and admission card. — Academics' },
  { name: 'Weather Alert', emoji: '⛈️', color: '#0891b2', bg: '#e0f2fe', template: 'Dear Parent, due to adverse weather conditions, school will start at {time} today. Students should come with raincoats. — Management' },
  { name: 'General Notice', emoji: '📢', color: '#059669', bg: '#f0fdf4', template: 'Dear Parent/Guardian, {message}. For enquiries call {phone}. — {school_name} Administration' },
];

export default function EmergencyPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [alertType, setAlertType] = useState(ALERT_TYPES[0]);
  const [message, setMessage] = useState(ALERT_TYPES[0].template);
  const [audience, setAudience] = useState<'all'|'form'|'custom'>('all');
  const [selectedForm, setSelectedForm] = useState(0);
  const [forms, setForms] = useState<any[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [confirmSend, setConfirmSend] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [alertR, studR, formR] = await Promise.all([
      supabase.from('school_emergency_alerts').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('school_students').select('id,guardian_phone,form_id').eq('status','Active'),
      supabase.from('school_forms').select('*').order('form_level'),
    ]);
    setAlerts(alertR.data || []);
    setStudents(studR.data || []);
    setForms(formR.data || []);
    // Count recipients
    const all = studR.data || [];
    setRecipientCount(new Set(all.filter(s => s.guardian_phone).map(s => s.guardian_phone)).size);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const all = students.filter(s => s.guardian_phone);
    if (audience === 'all') setRecipientCount(new Set(all.map(s=>s.guardian_phone)).size);
    else if (audience === 'form' && selectedForm) setRecipientCount(new Set(all.filter(s=>s.form_id===selectedForm).map(s=>s.guardian_phone)).size);
  }, [audience, selectedForm, students]);

  const sendAlert = async () => {
    if (!message.trim()) { toast.error('Write the message first'); return; }
    if (!confirmSend) { setConfirmSend(true); return; }
    setSending(true);
    const { error } = await supabase.from('school_emergency_alerts').insert([{
      alert_type: alertType.name, message, audience, form_id: audience==='form'?selectedForm:null,
      recipient_count: recipientCount, status: 'Sent', sent_at: new Date().toISOString(),
    }]);
    if (error) { toast.error(error.message); setSending(false); return; }
    toast.success(`🚨 Emergency alert sent to ${recipientCount} recipients!`, { duration: 6000 });
    setShowModal(false); setConfirmSend(false); setSending(false); fetchAll();
  };

  const STATUS_CFG: Record<string,{color:string;bg:string}> = {
    Sent: { color:'#16a34a', bg:'#f0fdf4' },
    Draft: { color:'#6b7280', bg:'#f9fafb' },
    Failed: { color:'#dc2626', bg:'#fef2f2' },
  };

  return (
    <div className="space-y-5 pb-10">
      <Toaster position="top-right" />

      {/* HERO */}
      <div className="rounded-2xl overflow-hidden shadow" style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b,#dc2626)' }}>
        <div className="px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl animate-pulse">🆘</div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Emergency Alert System</h1>
                <p className="text-red-200 text-sm">{recipientCount} parents reachable · {alerts.length} alerts sent · Instant mass SMS</p>
                <p className="text-red-300 text-xs mt-1">⚡ One click reaches ALL parents simultaneously via SMS & WhatsApp</p>
              </div>
            </div>
            <button onClick={() => { setShowModal(true); setConfirmSend(false); }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-red-700 font-black text-sm hover:bg-red-50 transition shadow-lg">
              <FiAlertTriangle size={16} /> Send Emergency Alert
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[
              { label: 'Parents Reachable', value: recipientCount, icon: '👨‍👩‍👧' },
              { label: 'Alerts This Year', value: alerts.length, icon: '📣' },
              { label: 'Alert Types', value: ALERT_TYPES.length, icon: '📋' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-3 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-xl font-black text-white">{s.value}</div>
                <div className="text-[10px] text-red-200">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alert type quick select */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Quick Alert Types</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {ALERT_TYPES.map(at => (
            <button key={at.name} onClick={() => { setAlertType(at); setMessage(at.template); setShowModal(true); setConfirmSend(false); }}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:shadow-md hover:scale-[1.02] transition-all text-left group">
              <span className="text-2xl flex-shrink-0">{at.emoji}</span>
              <div>
                <p className="text-xs font-black text-gray-800">{at.name}</p>
                <p className="text-[9px] text-gray-400 mt-0.5 group-hover:text-indigo-500 transition">Click to send →</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Alert history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-black text-gray-800">Alert History</h3>
          <p className="text-xs text-gray-500">{alerts.length} alerts sent — full audit trail</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" /></div>
        ) : alerts.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-4xl mb-2">📭</div><p className="text-sm">No alerts sent yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {alerts.map(a => {
              const typeCfg = ALERT_TYPES.find(t => t.name === a.alert_type) || ALERT_TYPES[7];
              const sCfg = STATUS_CFG[a.status] || STATUS_CFG.Sent;
              return (
                <div key={a.id} className="px-5 py-4 flex items-start gap-4 hover:bg-red-50/20 transition">
                  <div className="text-2xl flex-shrink-0 mt-0.5">{typeCfg.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-gray-800 text-sm">{a.alert_type}</p>
                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{a.message}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: sCfg.bg, color: sCfg.color }}>{a.status}</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">👥 {a.recipient_count} recipients</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{a.audience === 'all' ? '📢 All Parents' : a.audience === 'form' ? '📋 Specific Form' : '👤 Custom'}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-400 flex-shrink-0">
                        {a.sent_at ? new Date(a.sent_at).toLocaleDateString('en-KE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SQL Setup */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <summary className="text-xs font-black text-gray-600 cursor-pointer">🗄️ First-time setup SQL</summary>
        <code className="text-[10px] block bg-white rounded p-3 border mt-3 overflow-x-auto whitespace-pre">{`CREATE TABLE IF NOT EXISTS school_emergency_alerts (
  id serial PRIMARY KEY, alert_type text NOT NULL,
  message text NOT NULL, audience text DEFAULT 'all',
  form_id int REFERENCES school_forms(id),
  recipient_count int DEFAULT 0,
  status text DEFAULT 'Sent',
  sent_at timestamptz, created_at timestamptz DEFAULT now()
);
ALTER TABLE school_emergency_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_alerts" ON school_emergency_alerts FOR ALL USING (true) WITH CHECK (true);`}</code>
      </details>

      {/* SEND MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#fef2f2,#fee2e2)' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{alertType.emoji}</span>
                <div>
                  <h2 className="font-black text-gray-800">Send Emergency Alert</h2>
                  <p className="text-[10px] text-red-500">⚠️ This will SMS {recipientCount} parents immediately</p>
                </div>
              </div>
              <button onClick={() => { setShowModal(false); setConfirmSend(false); }} className="text-gray-400 hover:text-gray-600"><FiX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Alert Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {ALERT_TYPES.map(at => (
                    <button key={at.name} onClick={() => { setAlertType(at); setMessage(at.template); }}
                      className={`p-2 rounded-xl border text-center text-xs transition ${alertType.name===at.name?'border-red-400 bg-red-50':'border-gray-200 hover:border-red-200'}`}>
                      <div className="text-lg">{at.emoji}</div>
                      <div className={`text-[9px] font-bold leading-tight ${alertType.name===at.name?'text-red-700':'text-gray-500'}`}>{at.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Audience</label>
                <div className="flex gap-2">
                  {([['all','📢 All Parents'],['form','📋 Specific Form']] as const).map(([v,l]) => (
                    <button key={v} onClick={() => setAudience(v)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${audience===v?'bg-red-600 text-white border-red-600':'border-gray-200 text-gray-600 hover:border-red-300'}`}>{l}</button>
                  ))}
                </div>
                {audience === 'form' && (
                  <select value={selectedForm} onChange={e => setSelectedForm(Number(e.target.value))}
                    className="w-full mt-2 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-300">
                    <option value={0}>Select form…</option>
                    {forms.map(f => <option key={f.id} value={f.id}>{f.form_name}</option>)}
                  </select>
                )}
              </div>

              <div>
                <label className="text-xs font-black text-gray-600 block mb-1.5">Message *</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-300 resize-none"
                  placeholder="Type your message here. Edit the template above or write your own." />
                <p className="text-[10px] text-gray-400 mt-1">{message.length} characters · {Math.ceil(message.length/160)} SMS page{Math.ceil(message.length/160)!==1?'s':''}</p>
              </div>

              {/* Confirm banner */}
              {confirmSend && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4">
                  <p className="font-black text-red-700 text-sm">⚠️ CONFIRM SEND</p>
                  <p className="text-xs text-red-600 mt-1">This will send an SMS to <strong>{recipientCount} parents</strong> immediately. This action cannot be undone.</p>
                  <p className="text-xs text-red-500 mt-1">Click "Send Now" again to confirm.</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={sendAlert} disabled={sending}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-black text-sm disabled:opacity-60 transition ${confirmSend?'bg-red-600 hover:bg-red-700':'bg-red-500 hover:bg-red-600'}`}>
                {sending ? <FiRefreshCw size={14} className="animate-spin" /> : <FiSend size={14} />}
                {confirmSend ? `🚨 CONFIRM — Send to ${recipientCount} Parents` : `Send Alert to ${recipientCount} Parents`}
              </button>
              <button onClick={() => { setShowModal(false); setConfirmSend(false); }}
                className="px-5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

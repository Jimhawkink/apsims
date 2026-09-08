'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiBell, FiPlus, FiRefreshCw, FiSearch, FiCheck, FiTrash2, FiFilter } from 'react-icons/fi';

export default function NotificationCenterPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ notification_type: 'Fee Reminder', channel: 'SMS', recipient_name: '', recipient_phone: '', recipient_email: '', message: '', scheduled_at: '', priority: 'Normal', status: 'Queued' });

  const loadAll = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('school_notifications').select('*').order('created_at', { ascending: false }).limit(200);
    setNotifications(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const filtered = useMemo(() => {
    let rows = notifications;
    if (search) { const q = search.toLowerCase(); rows = rows.filter(n => (n.recipient_name || '').toLowerCase().includes(q) || (n.recipient_phone || '').includes(q) || (n.message || '').toLowerCase().includes(q)); }
    if (filter) rows = rows.filter(n => n.notification_type === filter);
    if (filterStatus) rows = rows.filter(n => n.status === filterStatus);
    return rows;
  }, [notifications, search, filter, filterStatus]);

  const kpis = useMemo(() => ({
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'Sent').length,
    queued: notifications.filter(n => n.status === 'Queued').length,
    failed: notifications.filter(n => n.status === 'Failed').length,
  }), [notifications]);

  const handleSave = async () => {
    if (!form.recipient_name || !form.message) { toast.error('Fill recipient name and message'); return; }
    setSaving(true);
    const { error } = await supabase.from('school_notifications').insert([{ ...form, created_at: new Date().toISOString() }]);
    if (error) { toast.error(error.message); } else { toast.success('Notification queued ✅'); setShowModal(false); loadAll(); setForm({ notification_type: 'Fee Reminder', channel: 'SMS', recipient_name: '', recipient_phone: '', recipient_email: '', message: '', scheduled_at: '', priority: 'Normal', status: 'Queued' }); }
    setSaving(false);
  };

  const markSent = async (id: number) => {
    const { error } = await supabase.from('school_notifications').update({ status: 'Sent', sent_at: new Date().toISOString() }).eq('id', id);
    if (!error) { toast.success('Marked as sent'); loadAll(); }
  };

  const deleteNotif = async (id: number) => {
    if (!confirm('Delete this notification?')) return;
    await supabase.from('school_notifications').delete().eq('id', id);
    toast.success('Deleted'); loadAll();
  };

  const typeColor: Record<string, { bg: string; color: string }> = {
    'Fee Reminder': { bg: '#eff6ff', color: '#1d4ed8' },
    'Defaulter': { bg: '#fef2f2', color: '#dc2626' },
    'Receipt': { bg: '#dcfce7', color: '#15803d' },
    'Demand Letter': { bg: '#fef9c3', color: '#854d0e' },
    'General': { bg: '#f8fafc', color: '#475569' },
  };
  const statusColor: Record<string, { bg: string; color: string }> = {
    'Sent': { bg: '#dcfce7', color: '#15803d' },
    'Queued': { bg: '#fef9c3', color: '#854d0e' },
    'Failed': { bg: '#fef2f2', color: '#dc2626' },
    'Scheduled': { bg: '#ede9fe', color: '#7c3aed' },
  };
  const TH = { padding: '10px 14px', textAlign: 'left' as const, fontWeight: 800, fontSize: 11, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.05em', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' };

  return (
    <div style={{ fontFamily: "ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif", minHeight: '100vh', background: '#f8fafc' }}>
      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#713f12 0%,#d97706 60%,#fbbf24 100%)', padding: '28px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🔔</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900 }}>Notification Centre</h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, opacity: 0.8 }}>SMS, email & push notifications log — all financial alerts and reminders</p>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={loadAll} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiRefreshCw size={14} /></button>
              <button onClick={() => setShowModal(true)} style={{ background: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#d97706', cursor: 'pointer', fontWeight: 900, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><FiPlus size={14} /> New Notification</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[['📨','Total',kpis.total,'All notifications'],['✅','Sent',kpis.sent,'Successfully delivered'],['⏳','Queued',kpis.queued,'Awaiting delivery'],['❌','Failed',kpis.failed,'Delivery failed']].map(([icon,label,val,sub],i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 20 }}>{icon}</div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 4 }}>{val}</div>
                <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>{sub}</div>
                <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}>
        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '2 1 200px' }}>
            <FiSearch style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search recipient, message…" style={{ width: '100%', paddingLeft: 34, paddingRight: 10, paddingTop: 9, paddingBottom: 9, border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '9px 10px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            <option value="">All Types</option>
            {['Fee Reminder','Defaulter','Receipt','Demand Letter','General'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '9px 10px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 13, outline: 'none', fontFamily: 'inherit' }}>
            <option value="">All Statuses</option>
            {['Queued','Sent','Failed','Scheduled'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#64748b', fontWeight: 700 }}>{filtered.length} notifications</span>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          {loading ? <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>Loading…</div> : (
            <div style={{ overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr>{['Type','Channel','Recipient','Phone/Email','Message','Priority','Status','Time','Actions'].map(h => <th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map((n, i) => {
                    const tc = typeColor[n.notification_type] || typeColor['General'];
                    const sc = statusColor[n.status] || statusColor['Queued'];
                    return (
                      <tr key={n.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                        <td style={{ padding: '10px 14px' }}><span style={{ background: tc.bg, color: tc.color, fontSize: 11, fontWeight: 800, padding: '3px 8px', borderRadius: 99 }}>{n.notification_type}</span></td>
                        <td style={{ padding: '10px 14px', color: '#475569', fontWeight: 700, fontSize: 12 }}>{n.channel}</td>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>{n.recipient_name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#64748b', fontSize: 12 }}>{n.recipient_phone || n.recipient_email || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#374151', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={n.message}>{n.message}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ background: n.priority === 'High' ? '#fee2e2' : n.priority === 'Urgent' ? '#fef2f2' : '#f1f5f9', color: n.priority === 'High' ? '#dc2626' : n.priority === 'Urgent' ? '#991b1b' : '#475569', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99 }}>{n.priority}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}><span style={{ background: sc.bg, color: sc.color, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 99 }}>{n.status}</span></td>
                        <td style={{ padding: '10px 14px', color: '#94a3b8', fontSize: 11 }}>{n.created_at ? new Date(n.created_at).toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {n.status === 'Queued' && <button onClick={() => markSent(n.id)} style={{ background: '#dcfce7', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#15803d' }} title="Mark Sent"><FiCheck size={12} /></button>}
                            <button onClick={() => deleteNotif(n.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: '#dc2626' }}><FiTrash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}><FiBell size={32} style={{ marginBottom: 8 }} /><br />No notifications found</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900 }}>📨 Create Notification</h3>
              <button onClick={() => setShowModal(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Type', key: 'notification_type', type: 'select', options: ['Fee Reminder','Defaulter','Receipt','Demand Letter','General'] },
                { label: 'Channel', key: 'channel', type: 'select', options: ['SMS','Email','WhatsApp','Push'] },
                { label: 'Priority', key: 'priority', type: 'select', options: ['Low','Normal','High','Urgent'] },
                { label: 'Recipient Name *', key: 'recipient_name', type: 'text' },
                { label: 'Phone', key: 'recipient_phone', type: 'tel' },
                { label: 'Email', key: 'recipient_email', type: 'email' },
                { label: 'Message *', key: 'message', type: 'textarea' },
                { label: 'Schedule At (optional)', key: 'scheduled_at', type: 'datetime-local' },
              ].map(({ label, key, type, options }: any) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 5, textTransform: 'uppercase' }}>{label}</label>
                  {type === 'select' ? (
                    <select value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit' }}>
                      {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : type === 'textarea' ? (
                    <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} style={{ width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
                  ) : (
                    <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '2px solid #e2e8f0', borderRadius: 9, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
              <button onClick={handleSave} disabled={saving} style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)', color: '#fff', border: 'none', borderRadius: 10, padding: '13px', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 }}>
                {saving ? 'Saving…' : '📨 Queue Notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

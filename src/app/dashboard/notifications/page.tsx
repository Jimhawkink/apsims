'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast, { Toaster } from 'react-hot-toast';
import {
  FiBell, FiPackage, FiDollarSign, FiShield, FiTrendingDown,
  FiCheckCircle, FiFilter, FiRefreshCw, FiAlertTriangle,
  FiArrowRight, FiVolume2, FiVolumeX, FiEye, FiTrash2
} from 'react-icons/fi';
import { useNotificationSound } from '@/hooks/useNotificationSound';

const TYPES = ['All', 'Store Requests', 'Payments', 'Discipline', 'Expenses', 'Low Stock'];

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (d < 1) return 'just now';
  if (d < 60) return `${d}m ago`;
  if (d < 1440) return `${Math.floor(d / 60)}h ago`;
  return `${Math.floor(d / 1440)}d ago`;
}
const fmt = (n: number) => `KES ${n.toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;

export default function NotificationsPage() {
  const [filter, setFilter] = useState('All');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());
  const { play } = useNotificationSound();

  useEffect(() => {
    try {
      const r = localStorage.getItem('apsims_notif_read');
      if (r) setReadSet(new Set(JSON.parse(r)));
      const s = localStorage.getItem('apsims_notif_sound');
      if (s !== null) setSoundOn(s === 'true');
    } catch { /* ignore */ }
  }, []);

  const saveRead = (s: Set<string>) => {
    try { localStorage.setItem('apsims_notif_read', JSON.stringify([...s])); } catch { /* ignore */ }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const [issues, payments, disc, exp, stock] = await Promise.all([
        supabase.from('school_store_issuances').select('id,item_name,quantity,unit,requested_by,status,created_at').order('created_at', { ascending: false }).limit(30),
        supabase.from('school_fee_payments').select('id,amount,payment_date,payment_method,school_students(first_name,last_name)').gte('payment_date', new Date(Date.now() - 86400000).toISOString().split('T')[0]).order('payment_date', { ascending: false }).limit(20),
        supabase.from('school_discipline_records').select('id,offense,created_at,school_students(first_name,last_name)').gte('created_at', weekAgo).order('created_at', { ascending: false }).limit(20),
        supabase.from('school_expenses').select('id,amount,description,expense_date,status').eq('status', 'pending').order('expense_date', { ascending: false }).limit(20),
        supabase.from('school_store_items').select('id,item_name,quantity').lt('quantity', 10).order('quantity', { ascending: true }).limit(15),
      ]);

      const all: any[] = [];

      (issues.data || []).forEach((r: any) => all.push({
        id: `issue_${r.id}`, category: 'Store Requests',
        urgency: r.status === 'Pending' ? 'urgent' : r.status === 'Verified' ? 'alert' : 'info',
        title: `🏪 Store Issue — ${r.status}`,
        message: `${r.item_name} × ${r.quantity} ${r.unit || ''} — requested by ${r.requested_by || 'Store Keeper'}`,
        time: r.created_at, href: '/dashboard/stores/ultra',
        icon: <FiPackage size={16} />, color: '#7c3aed', bg: '#f5f3ff',
      }));

      (payments.data || []).forEach((r: any) => {
        const name = r.school_students ? `${r.school_students.first_name} ${r.school_students.last_name}` : 'Student';
        all.push({
          id: `pay_${r.id}`, category: 'Payments', urgency: 'success',
          title: '💳 Fee Payment Received',
          message: `${name} paid ${fmt(Number(r.amount))} via ${r.payment_method || 'Cash'}`,
          time: r.payment_date + 'T00:00:00Z', href: '/dashboard/fees/collect',
          icon: <FiDollarSign size={16} />, color: '#16a34a', bg: '#f0fdf4',
        });
      });

      (disc.data || []).forEach((r: any) => {
        const name = r.school_students ? `${r.school_students.first_name} ${r.school_students.last_name}` : 'Student';
        all.push({
          id: `disc_${r.id}`, category: 'Discipline', urgency: 'alert',
          title: '⚠️ Discipline Incident',
          message: `${name} — ${r.offense || 'Incident recorded'}`,
          time: r.created_at, href: '/dashboard/discipline',
          icon: <FiShield size={16} />, color: '#dc2626', bg: '#fef2f2',
        });
      });

      (exp.data || []).forEach((r: any) => all.push({
        id: `exp_${r.id}`, category: 'Expenses', urgency: 'alert',
        title: '📋 Expense Awaiting Approval',
        message: `${r.description || 'Expense'} — ${fmt(Number(r.amount))}`,
        time: r.expense_date + 'T00:00:00Z', href: '/dashboard/expenses',
        icon: <FiTrendingDown size={16} />, color: '#d97706', bg: '#fffbeb',
      }));

      (stock.data || []).forEach((r: any) => all.push({
        id: `stock_${r.id}`, category: 'Low Stock', urgency: 'alert',
        title: '📦 Low Stock Warning',
        message: `${r.item_name} — only ${r.quantity} units left`,
        time: new Date().toISOString(), href: '/dashboard/stores/ultra',
        icon: <FiPackage size={16} />, color: '#9333ea', bg: '#faf5ff',
      }));

      // Sort: urgent + unread first, then by time
      all.sort((a, b) => {
        const aUrgent = a.urgency === 'urgent' && !readSet.has(a.id);
        const bUrgent = b.urgency === 'urgent' && !readSet.has(b.id);
        if (aUrgent && !bUrgent) return -1;
        if (!aUrgent && bUrgent) return 1;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      setItems(all);
    } catch { toast.error('Failed to load notifications'); }
    finally { setLoading(false); }
  }, [readSet]);

  useEffect(() => { fetchAll(); }, []);

  // Realtime subscription for store issuances
  useEffect(() => {
    const ch = supabase.channel('notif-page-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_store_issuances' }, () => {
        if (soundOn) play('urgent');
        fetchAll();
        toast('🚨 New store issue request — action needed!', { duration: 5000 });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_fee_payments' }, () => {
        if (soundOn) play('success');
        fetchAll();
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [soundOn, play, fetchAll]);

  const markRead = (id: string) => {
    const s = new Set(readSet); s.add(id); setReadSet(s); saveRead(s);
  };
  const markAllRead = () => {
    const s = new Set(items.map(i => i.id)); setReadSet(s); saveRead(s);
  };

  const displayed = filter === 'All' ? items : items.filter(i => i.category === filter);
  const unread = items.filter(i => !readSet.has(i.id)).length;
  const urgentCount = items.filter(i => i.urgency === 'urgent' && !readSet.has(i.id)).length;

  const URGENCY_CFG: Record<string, { label: string; color: string; bg: string }> = {
    urgent: { label: 'URGENT', color: '#dc2626', bg: '#fef2f2' },
    alert:  { label: 'Alert',  color: '#d97706', bg: '#fffbeb' },
    success:{ label: 'Done',   color: '#16a34a', bg: '#f0fdf4' },
    info:   { label: 'Info',   color: '#2563eb', bg: '#eff6ff' },
  };

  return (
    <div className="space-y-5">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="rounded-2xl px-6 py-5 text-white relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}>
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${urgentCount > 0 ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`}>
              🔔
            </div>
            <div>
              <h1 className="text-xl font-extrabold">Notification Centre</h1>
              <p className="text-sm text-white/70 mt-0.5">
                {urgentCount > 0
                  ? `🚨 ${urgentCount} URGENT action${urgentCount > 1 ? 's' : ''} need your attention now!`
                  : `${unread} unread · ${items.length} total · Live via Supabase Realtime`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { const n = !soundOn; setSoundOn(n); localStorage.setItem('apsims_notif_sound', String(n)); if (n) play('info'); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition">
              {soundOn ? <FiVolume2 size={14} /> : <FiVolumeX size={14} />}
              {soundOn ? 'Sound ON' : 'Sound OFF'}
            </button>
            <button onClick={markAllRead} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition">
              <FiCheckCircle size={14} /> Mark All Read
            </button>
            <button onClick={() => fetchAll()} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition">
              <FiRefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Urgent Alert Banner */}
      {urgentCount > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4 flex items-center gap-4">
          <span className="text-3xl animate-bounce">🚨</span>
          <div className="flex-1">
            <p className="font-black text-red-800 text-sm">{urgentCount} Store Issue Request{urgentCount > 1 ? 's' : ''} Awaiting Bursar / Principal Approval</p>
            <p className="text-xs text-red-600 mt-1">Scroll down to "Store Requests" to review. A loud alarm will sound on every new request.</p>
          </div>
          <Link href="/dashboard/stores/ultra" className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition flex items-center gap-2">
            Open Stores <FiArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Store Requests', count: items.filter(i => i.category === 'Store Requests').length, urgent: urgentCount, color: '#7c3aed', bg: '#f5f3ff', icon: '🏪' },
          { label: 'Fee Payments', count: items.filter(i => i.category === 'Payments').length, urgent: 0, color: '#16a34a', bg: '#f0fdf4', icon: '💳' },
          { label: 'Discipline', count: items.filter(i => i.category === 'Discipline').length, urgent: 0, color: '#dc2626', bg: '#fef2f2', icon: '⚠️' },
          { label: 'Pending Expenses', count: items.filter(i => i.category === 'Expenses').length, urgent: 0, color: '#d97706', bg: '#fffbeb', icon: '📋' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <span className="text-2xl">{s.icon}</span>
              {s.urgent > 0 && <span className="text-[9px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-full animate-pulse">URGENT</span>}
            </div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{s.count}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-2 flex-wrap bg-white rounded-xl p-1.5 border border-gray-100 shadow-sm w-fit">
        {TYPES.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === t ? 'bg-gray-900 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}>
            {t} {t !== 'All' ? `(${items.filter(i => i.category === t).length})` : `(${items.length})`}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <FiCheckCircle size={40} className="text-green-400 mb-3" />
            <p className="font-bold text-gray-600">All clear!</p>
            <p className="text-sm mt-1">No notifications in this category</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {displayed.map(n => {
              const isRead = readSet.has(n.id);
              const cfg = URGENCY_CFG[n.urgency] || URGENCY_CFG.info;
              return (
                <div key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 hover:bg-gray-50 transition cursor-pointer group ${
                    !isRead && n.urgency === 'urgent' ? 'bg-red-50/60 border-l-4 border-l-red-500' :
                    !isRead ? 'bg-blue-50/20 border-l-4 border-l-blue-300' : ''
                  }`}
                  onClick={() => markRead(n.id)}
                >
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: n.bg, color: n.color }}>
                    {n.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-bold ${isRead ? 'text-gray-600' : 'text-gray-900'}`}>{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(n.time)}</span>
                        <span className="text-[9px] font-black px-2 py-0.5 rounded-full"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                        style={{ background: n.bg, color: n.color }}>
                        {n.category}
                      </span>
                      {n.href && (
                        <Link href={n.href} onClick={e => { e.stopPropagation(); markRead(n.id); }}
                          className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold hover:text-blue-800">
                          View <FiArrowRight size={10} />
                        </Link>
                      )}
                      {!isRead && (
                        <button onClick={e => { e.stopPropagation(); markRead(n.id); }}
                          className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-green-600">
                          <FiEye size={10} /> Mark read
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Unread dot */}
                  {!isRead && (
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-2"
                      style={{ background: cfg.color }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sound guide */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="font-black text-gray-800 mb-3 flex items-center gap-2"><FiVolume2 className="text-indigo-500" /> Sound Alert Guide</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { sound: '🔊🔊🔊 3 LOUD BEEPS', type: 'Store issue request (Bursar/Principal)', color: '#dc2626', bg: '#fef2f2' },
            { sound: '🔔🔔 Double chime', type: 'Discipline incident / Pending expense', color: '#d97706', bg: '#fffbeb' },
            { sound: '✅ Ascending chime', type: 'Fee payment received', color: '#16a34a', bg: '#f0fdf4' },
            { sound: '🔔 Single ding', type: 'General info / Low stock alert', color: '#2563eb', bg: '#eff6ff' },
          ].map(g => (
            <div key={g.type} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: g.bg }}>
              <span className="text-lg">{g.sound.split(' ')[0]}</span>
              <div>
                <p className="text-xs font-black" style={{ color: g.color }}>{g.sound.slice(g.sound.indexOf(' ') + 1)}</p>
                <p className="text-[11px] text-gray-500">{g.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

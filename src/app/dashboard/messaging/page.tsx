'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { FiSend, FiPlus, FiX, FiUsers, FiHash, FiSearch, FiPaperclip, FiRefreshCw } from 'react-icons/fi';

const CHANNELS = [
  { id: 'all_staff', name: 'All Staff', emoji: '📢', desc: 'Broadcast to everyone', fixed: true },
  { id: 'academic', name: 'Academic Dept', emoji: '📚', desc: 'Teaching staff only', fixed: true },
  { id: 'finance', name: 'Finance Team', emoji: '💰', desc: 'Bursar & finance staff', fixed: true },
  { id: 'admin', name: 'Administration', emoji: '🏢', desc: 'Admin & management', fixed: true },
  { id: 'general', name: 'General Chat', emoji: '💬', desc: 'Open discussion', fixed: true },
];

function timeAgo(s: string) {
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 60000);
  if (d < 1) return 'just now'; if (d < 60) return `${d}m`; if (d < 1440) return `${Math.floor(d/60)}h`; return `${Math.floor(d/1440)}d`;
}

export default function MessagingPage() {
  const [channel, setChannel] = useState('all_staff');
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState('Admin');
  const [userRole, setUserRole] = useState('Admin');
  const [search, setSearch] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const u = localStorage.getItem('school_user');
      if (u) { const p = JSON.parse(u); setUserName(p.full_name||'Admin'); setUserRole(p.role||'Admin'); }
    } catch {}
  }, []);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('school_staff_messages')
      .select('*').eq('channel', channel).order('created_at').limit(100);
    setMessages(data || []);
    setLoading(false);
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [channel]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // Realtime subscription
  useEffect(() => {
    const ch = supabase.channel(`msg-${channel}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_staff_messages', filter: `channel=eq.${channel}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [channel]);

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    const { error } = await supabase.from('school_staff_messages').insert([{
      channel, sender_name: userName, sender_role: userRole,
      message: text.trim(), created_at: new Date().toISOString(),
    }]);
    if (error) toast.error(error.message);
    else setText('');
    setSending(false);
  };

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const filtered = messages.filter(m => search === '' || m.message.toLowerCase().includes(search.toLowerCase()) || m.sender_name.toLowerCase().includes(search.toLowerCase()));
  const currentChannel = CHANNELS.find(c => c.id === channel);
  const roleColors: Record<string,string> = { Principal:'#dc2626', Admin:'#7c3aed', Bursar:'#d97706', Teacher:'#2563eb', HOD:'#059669', 'Store Keeper':'#b45309' };

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <Toaster position="top-right" />

      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50">
        <div className="px-4 py-4 border-b border-gray-100" style={{ background: 'linear-gradient(135deg,#1e293b,#334155)' }}>
          <h2 className="font-black text-white text-sm">💬 Staff Messaging</h2>
          <p className="text-gray-400 text-[10px] mt-0.5">Internal school communication</p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-bold">Live · Realtime</span>
          </div>
        </div>
        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-2">
          <p className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-widest">Channels</p>
          {CHANNELS.map(c => (
            <button key={c.id} onClick={() => setChannel(c.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${channel === c.id ? 'bg-indigo-50 border-r-2 border-indigo-500' : 'hover:bg-gray-100'}`}>
              <span className="text-base flex-shrink-0">{c.emoji}</span>
              <div className="min-w-0">
                <p className={`text-xs font-bold truncate ${channel === c.id ? 'text-indigo-700' : 'text-gray-700'}`}># {c.name}</p>
                <p className="text-[9px] text-gray-400 truncate">{c.desc}</p>
              </div>
            </button>
          ))}
        </div>
        {/* Your info */}
        <div className="px-4 py-3 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-black"
              style={{ background: roleColors[userRole] || '#6366f1' }}>{userName.charAt(0)}</div>
            <div>
              <p className="text-[11px] font-black text-gray-700 truncate">{userName}</p>
              <p className="text-[9px] text-gray-400">{userRole}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat header */}
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <span className="text-xl">{currentChannel?.emoji}</span>
            <div>
              <h3 className="font-black text-gray-800 text-sm"># {currentChannel?.name}</h3>
              <p className="text-[10px] text-gray-500">{currentChannel?.desc} · {messages.length} messages</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
              <FiSearch size={12} className="text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search messages…"
                className="text-xs outline-none bg-transparent text-gray-700 w-32" />
            </div>
            <button onClick={fetchMessages} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition">
              <FiRefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <div className="text-5xl mb-3">💬</div>
              <p className="font-black text-gray-600">No messages yet</p>
              <p className="text-sm mt-1">Be the first to post in #{currentChannel?.name}!</p>
            </div>
          ) : filtered.map((m, i) => {
            const isMe = m.sender_name === userName;
            const prevSame = i > 0 && filtered[i-1].sender_name === m.sender_name;
            return (
              <div key={m.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                {!prevSame && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black flex-shrink-0 mt-0.5"
                    style={{ background: roleColors[m.sender_role] || '#6366f1' }}>
                    {m.sender_name?.charAt(0)}
                  </div>
                )}
                {prevSame && <div className="w-8 flex-shrink-0" />}
                <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!prevSame && (
                    <div className={`flex items-center gap-2 mb-0.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[11px] font-black text-gray-700">{m.sender_name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: roleColors[m.sender_role] || '#6366f1', fontSize:8 }}>{m.sender_role}</span>
                      <span className="text-[10px] text-gray-400">{timeAgo(m.created_at)}</span>
                    </div>
                  )}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm ${isMe ? 'rounded-tr-sm' : 'rounded-tl-sm'} ${isMe ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {m.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>

        {/* Message input */}
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <div className="flex items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-indigo-300 focus-within:border-indigo-300 transition">
            <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={handleKey}
              placeholder={`Message #${currentChannel?.name}… (Enter to send, Shift+Enter for new line)`}
              rows={1} style={{ resize:'none' }}
              className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400 max-h-24 overflow-y-auto" />
            <button onClick={send} disabled={sending || !text.trim()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              {sending ? <FiRefreshCw size={15} className="animate-spin" /> : <FiSend size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">💡 Enter = send · Shift+Enter = new line · Messages are visible to all staff in this channel</p>
        </div>
      </div>
    </div>
  );
}

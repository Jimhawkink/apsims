'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { FiSend, FiPlus, FiSearch, FiMoreVertical, FiBell, FiUsers, FiMessageSquare, FiVolume2, FiMic, FiPaperclip, FiSmile, FiCheck, FiCheckCircle, FiX, FiHash } from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChatRoom {
    id: number;
    room_type: 'staff' | 'class' | 'parent_teacher' | 'broadcast' | 'direct';
    room_name: string;
    form_id?: number;
    created_at: string;
    lastMessage?: ChatMessage;
    unreadCount?: number;
}

interface ChatMessage {
    id: number;
    room_id: number;
    sender_id: number;
    sender_name: string;
    sender_role: string;
    message: string;
    message_type: 'text' | 'image' | 'audio' | 'file' | 'announcement';
    attachment_url?: string;
    is_deleted: boolean;
    read_by: number[];
    created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROOM_ICONS: Record<string, string> = {
    staff: '👩‍🏫',
    class: '🏫',
    parent_teacher: '👨‍👩‍👧',
    broadcast: '📢',
    direct: '💬',
};
const ROOM_COLORS: Record<string, string> = {
    staff: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    class: 'linear-gradient(135deg,#0891b2,#06b6d4)',
    parent_teacher: 'linear-gradient(135deg,#059669,#10b981)',
    broadcast: 'linear-gradient(135deg,#dc2626,#ef4444)',
    direct: 'linear-gradient(135deg,#d97706,#f59e0b)',
};

// ── WhatsApp-style Message Ticks ─────────────────────────────────────────────
type TickStatus = 'sending' | 'sent' | 'delivered' | 'read';

function getTickStatus(msg: ChatMessage, currentUserId: number): TickStatus {
    if (!msg.id || msg.id < 0) return 'sending';
    const others = (msg.read_by || []).filter(id => id !== msg.sender_id);
    if (others.length > 0) return 'read';
    return 'sent';
}

/** SVG double-tick identical to WhatsApp style */
function WaTicks({ status }: { status: TickStatus }) {
    if (status === 'sending') {
        return (
            <svg width="12" height="12" viewBox="0 0 12 12" style={{ opacity: 0.5 }}>
                <circle cx="6" cy="6" r="5" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10">
                    <animateTransform attributeName="transform" type="rotate" from="0 6 6" to="360 6 6" dur="1s" repeatCount="indefinite" />
                </circle>
            </svg>
        );
    }
    // Single tick — sent
    if (status === 'sent') {
        return (
            <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <polyline points="1,5 5,9 13,1" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    // Delivered — double grey ticks
    if (status === 'delivered') {
        return (
            <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
                <polyline points="1,5 5,9 13,1" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="5,5 9,9 17,1" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    }
    // Read — double BLUE ticks
    return (
        <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
            <polyline points="1,5 5,9 13,1" stroke="#53c1f5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="5,5 9,9 17,1" stroke="#53c1f5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}


function Avatar({ name, size = 36, gradient }: { name: string; size?: number; gradient?: string }) {
    const ini = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', flexShrink: 0,
            background: gradient || 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 900, fontSize: size * 0.35,
            boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
        }}>{ini}</div>
    );
}

function formatTime(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-KE', { weekday: 'short' });
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ChatPage() {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
    const [text, setText] = useState('');
    const [searchQ, setSearchQ] = useState('');
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showNewRoom, setShowNewRoom] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomType, setNewRoomType] = useState<ChatRoom['room_type']>('staff');
    const [currentUser, setCurrentUser] = useState<any>(null);
    // Presence — who is online in this room right now
    const [onlinePresence, setOnlinePresence] = useState<Map<string, any>>(new Map());
    // Typing — who is currently typing
    const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
    const typingTimeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const channelRef = useRef<any>(null);


    // ── Current user ──────────────────────────────────────────────────────────
    useEffect(() => {
        try {
            const u = JSON.parse(localStorage.getItem('school_user') || '{}');
            setCurrentUser(u);
        } catch {}
    }, []);

    // ── Load rooms ─────────────────────────────────────────────────────────────
    const loadRooms = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('school_chat_rooms')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: true });
        if (error) { toast.error('Failed to load rooms'); setLoading(false); return; }
        setRooms(data || []);
        if (data && data.length > 0 && !activeRoom) setActiveRoom(data[0]);
        setLoading(false);
    }, [activeRoom]);

    useEffect(() => { loadRooms(); }, []);

    // ── Load messages for active room ─────────────────────────────────────────
    const loadMessages = useCallback(async (roomId: number) => {
        setLoadingMessages(true);
        const { data, error } = await supabase
            .from('school_chat_messages')
            .select('*')
            .eq('room_id', roomId)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(200);
        if (!error) setMessages(data || []);
        setLoadingMessages(false);
    }, []);

    useEffect(() => {
        if (!activeRoom) return;
        loadMessages(activeRoom.id);
    }, [activeRoom, loadMessages]);

    // ── Supabase Realtime: Presence + Typing + Messages ───────────────────────
    useEffect(() => {
        if (!activeRoom || !currentUser?.id) return;

        // Unsubscribe from previous channel
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
        }
        // Reset typing on room switch
        setTypingUsers(new Map());
        setOnlinePresence(new Map());

        const channel = supabase
            .channel(`chat-room-${activeRoom.id}`, {
                config: { presence: { key: String(currentUser.id) } },
            })

            // ── PRESENCE — track online users ─────────────────────────────
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState<{ user_id: number; user_name: string }>();
                setOnlinePresence(new Map(Object.entries(state)));
            })

            // ── BROADCAST — typing events ─────────────────────────────────
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                const { user_id, user_name, is_typing } = payload as { user_id: number; user_name: string; is_typing: boolean };
                if (user_id === currentUser.id) return; // ignore self
                if (is_typing) {
                    setTypingUsers(prev => new Map(prev).set(user_id, user_name));
                    // Auto-clear after 4s silence
                    const existing = typingTimeouts.current.get(user_id);
                    if (existing) clearTimeout(existing);
                    const t = setTimeout(() => {
                        setTypingUsers(prev => { const next = new Map(prev); next.delete(user_id); return next; });
                    }, 4000);
                    typingTimeouts.current.set(user_id, t);
                } else {
                    setTypingUsers(prev => { const next = new Map(prev); next.delete(user_id); return next; });
                }
            })

            // ── POSTGRES INSERT — new messages ────────────────────────────
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'school_chat_messages',
                filter: `room_id=eq.${activeRoom.id}`,
            }, (payload) => {
                const newMsg = payload.new as ChatMessage;
                setMessages(prev => {
                    if (prev.find(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
                // Clear typing for that sender
                setTypingUsers(prev => { const next = new Map(prev); next.delete(newMsg.sender_id); return next; });
            })

            // ── POSTGRES UPDATE — read-receipt tick upgrades ──────────────
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'school_chat_messages',
                filter: `room_id=eq.${activeRoom.id}`,
            }, (payload) => {
                const updated = payload.new as ChatMessage;
                setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read_by: updated.read_by } : m));
            })

            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // Announce our presence to the room
                    await channel.track({
                        user_id: currentUser.id,
                        user_name: currentUser.full_name || currentUser.username || 'User',
                        online_at: new Date().toISOString(),
                    });
                }
            });

        channelRef.current = channel;

        return () => {
            channel.untrack();
            supabase.removeChannel(channel);
            typingTimeouts.current.forEach(clearTimeout);
        };
    }, [activeRoom, currentUser]);



    // ── Mark all messages as READ when entering room ──────────────────────────
    const markAsRead = useCallback(async (roomId: number) => {
        if (!currentUser?.id) return;
        // Get messages in this room NOT sent by me AND not already read by me
        const { data: unread } = await supabase
            .from('school_chat_messages')
            .select('id, read_by')
            .eq('room_id', roomId)
            .neq('sender_id', currentUser.id)
            .eq('is_deleted', false);
        if (!unread || unread.length === 0) return;
        const toMark = unread.filter(m => !(m.read_by || []).includes(currentUser.id));
        // Batch update using array_append
        for (const msg of toMark) {
            supabase
                .from('school_chat_messages')
                .update({ read_by: [...(msg.read_by || []), currentUser.id] })
                .eq('id', msg.id)
                .then(() => {}); // fire and forget
        }
    }, [currentUser]);

    // Auto mark as read when room changes
    useEffect(() => {
        if (activeRoom?.id) markAsRead(activeRoom.id);
    }, [activeRoom?.id, markAsRead]);



    // ── Auto scroll to bottom ─────────────────────────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── Broadcast typing event ────────────────────────────────────────────────
    const broadcastTyping = useCallback((isTyping: boolean) => {
        if (!channelRef.current || !currentUser) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'typing',
            payload: { user_id: currentUser.id, user_name: currentUser.full_name || 'User', is_typing: isTyping },
        }).catch(() => {});
    }, [currentUser]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        if (!text.trim() || !activeRoom || !currentUser) return;
        broadcastTyping(false); // stop typing indicator before send
        setSending(true);
        const payload = {
            room_id: activeRoom.id,
            sender_id: currentUser.id,
            sender_name: currentUser.full_name || currentUser.username || 'User',
            sender_role: currentUser.role || 'staff',
            message: text.trim(),
            message_type: 'text',
            is_deleted: false,
            read_by: [currentUser.id],
            created_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('school_chat_messages').insert([payload]);
        if (error) { toast.error('Failed to send'); }
        else {
            setText('');
            inputRef.current?.focus();
            // Fire push notification to room members
            try {
                await fetch('/api/push/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetRole: activeRoom.room_type === 'broadcast' ? 'all' : undefined,
                        title: `💬 ${activeRoom.room_name}`,
                        message: `${payload.sender_name}: ${payload.message.slice(0, 80)}`,
                        channelId: 'apsims-chat',
                        sound: 'message-pop',
                        notificationType: 'chat',
                        data: { roomId: activeRoom.id, roomName: activeRoom.room_name },
                    }),
                });
            } catch { /* non-critical */ }
        }
        setSending(false);
    }, [text, activeRoom, currentUser, broadcastTyping]);


    // ── Create room ───────────────────────────────────────────────────────────
    const createRoom = async () => {
        if (!newRoomName.trim()) return;
        const { error } = await supabase.from('school_chat_rooms').insert([{
            room_type: newRoomType,
            room_name: newRoomName.trim(),
            is_active: true,
            created_by: currentUser?.id,
        }]);
        if (error) { toast.error('Failed to create room'); return; }
        toast.success('Room created! 🎉');
        setShowNewRoom(false);
        setNewRoomName('');
        loadRooms();
    };

    // ── Keyboard shortcut: Enter to send, Shift+Enter for newline ─────────────
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ── Filtered rooms ─────────────────────────────────────────────────────────
    const filteredRooms = useMemo(() =>
        rooms.filter(r => r.room_name?.toLowerCase().includes(searchQ.toLowerCase())),
        [rooms, searchQ]
    );

    // ── Group messages by date ─────────────────────────────────────────────────
    const groupedMessages = useMemo(() => {
        const groups: { date: string; messages: ChatMessage[] }[] = [];
        messages.forEach(msg => {
            const date = new Date(msg.created_at).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' });
            const last = groups[groups.length - 1];
            if (last && last.date === date) last.messages.push(msg);
            else groups.push({ date, messages: [msg] });
        });
        return groups;
    }, [messages]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 64px)', fontFamily: 'Outfit, Inter, sans-serif', overflow: 'hidden', gap: 0 }}>
            <style>{`
                @keyframes msgIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .msg-bubble { animation: msgIn 0.2s ease both; }
                .room-item { transition: all 0.15s ease; cursor: pointer; }
                .room-item:hover { background: rgba(99,102,241,0.06) !important; }
                .send-btn { transition: all 0.15s; }
                .send-btn:hover { transform: scale(1.08); }
                .send-btn:active { transform: scale(0.95); }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
                textarea { resize: none; }
                @keyframes typingDot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-5px);opacity:1} }

            `}</style>

            {/* ════ LEFT: ROOMS SIDEBAR ════ */}
            <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', background: '#fff' }}>
                {/* Sidebar Header */}
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div>
                            <h2 style={{ fontWeight: 900, fontSize: 16, color: '#0f172a', margin: 0 }}>💬 School Chat</h2>
                            <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Real-time messaging</p>
                        </div>
                        <button
                            onClick={() => setShowNewRoom(true)}
                            style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', boxShadow: '0 4px 12px rgba(99,102,241,0.4)' }}
                            title="Create new room"
                        >
                            <FiPlus size={16} />
                        </button>
                    </div>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <FiSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={13} />
                        <input
                            value={searchQ} onChange={e => setSearchQ(e.target.value)}
                            placeholder="Search rooms…"
                            style={{ width: '100%', paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1.5px solid #f1f5f9', borderRadius: 12, fontSize: 13, outline: 'none', background: '#f8faff', fontFamily: 'Outfit, Inter, sans-serif', boxSizing: 'border-box' }}
                        />
                    </div>
                </div>

                {/* Room list */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Loading rooms…</div>
                    ) : filteredRooms.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center' }}>
                            <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                            <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>No rooms yet</p>
                            <p style={{ fontSize: 12, color: '#cbd5e1' }}>Click + to create the first room</p>
                        </div>
                    ) : filteredRooms.map(room => {
                        const isActive = activeRoom?.id === room.id;
                        return (
                            <div key={room.id} className="room-item"
                                onClick={() => setActiveRoom(room)}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent', borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: isActive ? ROOM_COLORS[room.room_type] : '#f1f5f9', boxShadow: isActive ? '0 4px 12px rgba(99,102,241,0.3)' : 'none' }}>
                                    {ROOM_ICONS[room.room_type]}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ fontWeight: 800, fontSize: 13, color: isActive ? '#1e1b4b' : '#1e293b', margin: 0, marginBottom: 2 }}>{room.room_name}</p>
                                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, textTransform: 'capitalize' }}>{room.room_type.replace('_', ' ')}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ════ RIGHT: CHAT PANEL ════ */}
            {!activeRoom ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8faff', gap: 12 }}>
                    <div style={{ fontSize: 72 }}>💬</div>
                    <h3 style={{ fontWeight: 900, color: '#1e293b', margin: 0 }}>Select a Room to Start</h3>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Real-time school communication</p>
                </div>
            ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8faff', minWidth: 0 }}>
                    {/* Chat Header */}
                    <div style={{ padding: '14px 20px', background: '#fff', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: ROOM_COLORS[activeRoom.room_type], boxShadow: '0 4px 12px rgba(99,102,241,0.25)' }}>
                            {ROOM_ICONS[activeRoom.room_type]}
                        </div>
                        <div style={{ flex: 1 }}>
                            <p style={{ fontWeight: 900, fontSize: 15, color: '#0f172a', margin: 0 }}>{activeRoom.room_name}</p>
                            {/* Live status line — typing takes priority over online count */}
                            {typingUsers.size > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        {[0,1,2].map(i => (
                                            <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#6366f1', display: 'inline-block', animation: `typingDot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700 }}>
                                        {[...typingUsers.values()].map(n => n.split(' ')[0]).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing…
                                    </span>
                                </div>
                            ) : (
                                <p style={{ fontSize: 11, color: onlinePresence.size > 1 ? '#059669' : '#94a3b8', margin: 0, fontWeight: onlinePresence.size > 1 ? 700 : 400 }}>
                                    {onlinePresence.size > 1 ? `🟢 ${onlinePresence.size} online` : activeRoom.room_type.replace('_', ' ')}
                                </p>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', animation: 'msgIn 1s ease infinite alternate' }} />
                                <span style={{ fontSize: 10, fontWeight: 800, color: '#059669' }}>LIVE</span>
                            </div>
                            <button style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #f1f5f9', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                <FiMoreVertical size={16} />
                            </button>
                        </div>
                    </div>


                    {/* Messages Area — WhatsApp-style wallpaper */}
                    <div style={{
                        flex: 1, overflowY: 'auto', padding: '20px 24px',
                        display: 'flex', flexDirection: 'column', gap: 4,
                        backgroundColor: '#e6eaf5',
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Cdefs%3E%3Cpattern id='p' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='10' cy='10' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Ccircle cx='50' cy='10' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Ccircle cx='90' cy='10' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%238b5cf6' opacity='0.06'/%3E%3Ccircle cx='70' cy='30' r='1.5' fill='%238b5cf6' opacity='0.06'/%3E%3Ccircle cx='10' cy='50' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Ccircle cx='50' cy='50' r='2' fill='%236366f1' opacity='0.05'/%3E%3Ccircle cx='90' cy='50' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Ccircle cx='30' cy='70' r='1.5' fill='%238b5cf6' opacity='0.06'/%3E%3Ccircle cx='70' cy='70' r='1.5' fill='%238b5cf6' opacity='0.06'/%3E%3Ccircle cx='10' cy='90' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Ccircle cx='50' cy='90' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Ccircle cx='90' cy='90' r='1.5' fill='%236366f1' opacity='0.07'/%3E%3Cpath d='M20 20 L25 20 M20 20 L20 25' stroke='%236366f1' stroke-width='0.8' opacity='0.05' stroke-linecap='round'/%3E%3Cpath d='M60 60 L65 60 M60 60 L60 65' stroke='%238b5cf6' stroke-width='0.8' opacity='0.05' stroke-linecap='round'/%3E%3Cpath d='M80 20 L85 20 M80 20 L80 25' stroke='%236366f1' stroke-width='0.8' opacity='0.05' stroke-linecap='round'/%3E%3Cpath d='M20 80 L25 80 M20 80 L20 85' stroke='%238b5cf6' stroke-width='0.8' opacity='0.05' stroke-linecap='round'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100' height='100' fill='url(%23p)'/%3E%3C/svg%3E")`,
                        backgroundRepeat: 'repeat',
                    }}>

                        {loadingMessages ? (
                            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'msgIn 1s linear infinite', margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>Loading messages…</p>
                                </div>
                            </div>
                        ) : messages.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8 }}>
                                <div style={{ fontSize: 56 }}>👋</div>
                                <p style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, margin: 0 }}>Say hello to {activeRoom.room_name}!</p>
                                <p style={{ color: '#94a3b8', fontSize: 13, margin: 0 }}>Be the first to send a message</p>
                            </div>
                        ) : groupedMessages.map(({ date, messages: dayMsgs }) => (
                            <div key={date}>
                                {/* Date divider */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
                                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                    <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, padding: '4px 12px', background: '#f1f5f9', borderRadius: 20 }}>{date}</span>
                                    <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
                                </div>
                                {dayMsgs.map((msg, idx) => {
                                    const isMe = msg.sender_id === currentUser?.id;
                                    const showAvatar = !isMe && (idx === 0 || dayMsgs[idx - 1]?.sender_id !== msg.sender_id);
                                    const showName = showAvatar;
                                    return (
                                        <div key={msg.id} className="msg-bubble"
                                            style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 4, gap: 8 }}>
                                            {/* Avatar for others */}
                                            {!isMe && (
                                                <div style={{ width: 32, flexShrink: 0, display: 'flex', alignItems: 'flex-end' }}>
                                                    {showAvatar && <Avatar name={msg.sender_name} size={32} />}
                                                </div>
                                            )}
                                            <div style={{ maxWidth: '68%' }}>
                                                {showName && !isMe && (
                                                    <p style={{ fontSize: 10, fontWeight: 800, color: '#6366f1', margin: '0 0 3px 4px' }}>
                                                        {msg.sender_name} · <span style={{ color: '#94a3b8', fontWeight: 600 }}>{msg.sender_role}</span>
                                                    </p>
                                                )}
                                                <div style={{
                                                    padding: '10px 14px',
                                                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                    background: isMe
                                                        ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
                                                        : '#fff',
                                                    color: isMe ? '#fff' : '#1e293b',
                                                    fontSize: 14, lineHeight: 1.5, fontWeight: 500,
                                                    boxShadow: isMe
                                                        ? '0 4px 16px rgba(99,102,241,0.3)'
                                                        : '0 2px 8px rgba(0,0,0,0.06)',
                                                }}>
                                                    {msg.message_type === 'announcement' && (
                                                        <span style={{ display: 'block', fontSize: 10, fontWeight: 900, color: isMe ? 'rgba(255,255,255,0.7)' : '#6366f1', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>📢 ANNOUNCEMENT</span>
                                                    )}
                                                    {msg.message}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: isMe ? 'flex-end' : 'flex-start', marginTop: 3, paddingRight: isMe ? 4 : 0, paddingLeft: isMe ? 0 : 4 }}>
                                                    <span style={{ fontSize: 9, color: isMe ? 'rgba(255,255,255,0.55)' : '#94a3b8' }}>{formatTime(msg.created_at)}</span>
                                                    {isMe && (
                                                        <WaTicks status={getTickStatus(msg, currentUser?.id ?? -1)} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* ── Message Input Bar ── */}
                    <div style={{ padding: '12px 20px 16px', background: '#fff', borderTop: '1px solid #f1f5f9', boxShadow: '0 -2px 12px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, padding: '8px 12px', background: '#f8faff', borderRadius: 20, border: '1.5px solid #e2e8f0', transition: 'border-color 0.15s' }}>
                            <button style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Attach file">
                                <FiPaperclip size={16} />
                            </button>
                            <textarea
                                ref={inputRef}
                                value={text}
                                onChange={e => { setText(e.target.value); broadcastTyping(e.target.value.length > 0); }}
                                onKeyDown={handleKeyDown}
                                placeholder={`Message ${activeRoom.room_name}… (Enter to send)`}
                                rows={1}
                                style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'Outfit, Inter, sans-serif', color: '#1e293b', padding: '6px 0', maxHeight: 120, minHeight: 36, lineHeight: 1.5, overflowY: 'auto', resize: 'none' }}
                                onInput={e => {
                                    const el = e.target as HTMLTextAreaElement;
                                    el.style.height = 'auto';
                                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                                }}
                            />
                            <button style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} title="Emoji">
                                <FiSmile size={16} />
                            </button>
                            {/* Send button */}
                            <button
                                className="send-btn"
                                onClick={sendMessage}
                                disabled={!text.trim() || sending}
                                style={{ width: 40, height: 40, borderRadius: 14, border: 'none', cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', opacity: text.trim() ? 1 : 0.4, background: text.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#e2e8f0', color: '#fff', boxShadow: text.trim() ? '0 4px 16px rgba(99,102,241,0.4)' : 'none' }}
                            >
                                {sending ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <FiSend size={16} />}
                            </button>
                        </div>
                        <p style={{ fontSize: 10, color: '#cbd5e1', textAlign: 'center', marginTop: 6, fontWeight: 600 }}>
                            Enter to send · Shift+Enter for new line · Messages encrypted in transit
                        </p>
                    </div>
                </div>
            )}

            {/* ════ NEW ROOM MODAL ════ */}
            {showNewRoom && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,12,41,0.6)', backdropFilter: 'blur(8px)' }}>
                    <div style={{ width: 420, background: '#fff', borderRadius: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'fadeIn 0.25s ease' }}>
                        <div style={{ padding: '20px 24px', background: 'linear-gradient(135deg,#1e1b4b,#312e81)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h3 style={{ color: '#fff', fontWeight: 900, fontSize: 16, margin: 0 }}>Create New Room</h3>
                                <p style={{ color: 'rgba(199,210,254,0.7)', fontSize: 12, margin: 0 }}>Start a new conversation</p>
                            </div>
                            <button onClick={() => setShowNewRoom(false)} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FiX size={14} />
                            </button>
                        </div>
                        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Room Type</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                    {(['staff', 'class', 'parent_teacher', 'broadcast'] as const).map(t => (
                                        <button key={t} onClick={() => setNewRoomType(t)}
                                            style={{ padding: '10px 14px', borderRadius: 14, border: `2px solid ${newRoomType === t ? '#6366f1' : '#e2e8f0'}`, background: newRoomType === t ? 'rgba(99,102,241,0.08)' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 700, fontSize: 13, color: newRoomType === t ? '#4338ca' : '#64748b', transition: 'all 0.15s' }}>
                                            <span>{ROOM_ICONS[t]}</span>
                                            <span style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Room Name</label>
                                <input
                                    value={newRoomName} onChange={e => setNewRoomName(e.target.value)}
                                    placeholder={`e.g. ${newRoomType === 'staff' ? 'Staff Room' : newRoomType === 'class' ? 'Form 3 East' : newRoomType === 'broadcast' ? 'School Announcements' : 'Form 2 Parents'}`}
                                    style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 14, fontSize: 14, fontFamily: 'Outfit, Inter, sans-serif', outline: 'none', boxSizing: 'border-box', fontWeight: 600 }}
                                    onKeyDown={e => { if (e.key === 'Enter') createRoom(); }}
                                />
                            </div>
                            <button onClick={createRoom} disabled={!newRoomName.trim()}
                                style={{ width: '100%', padding: '14px', borderRadius: 18, border: 'none', cursor: newRoomName.trim() ? 'pointer' : 'not-allowed', fontWeight: 900, fontSize: 14, fontFamily: 'Outfit, Inter, sans-serif', background: newRoomName.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f1f5f9', color: newRoomName.trim() ? '#fff' : '#94a3b8', boxShadow: newRoomName.trim() ? '0 6px 24px rgba(99,102,241,0.4)' : 'none', transition: 'all 0.15s' }}>
                                Create Room 🚀
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

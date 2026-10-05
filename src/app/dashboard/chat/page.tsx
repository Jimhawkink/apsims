'use client';
// ═══════════════════════════════════════════════════════════════════════════
// APSIMS School Chat — WhatsApp-exact light UI
// Contacts-based DIRECT messaging: parent↔teacher, parent↔school, staff↔staff
// ═══════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FiSearch, FiMoreVertical, FiPhone, FiVideo, FiArrowLeft, FiSmile, FiPaperclip } from 'react-icons/fi';
import { BsSend } from 'react-icons/bs';




interface Contact {
    id: number;
    full_name: string;
    username: string;
    role: string;
    lastMessage?: string;
    lastTime?: string;
    unread: number;
}
interface ChatMessage {
    id: number;
    room_id: number;
    sender_id: number;
    sender_name: string;
    sender_role: string;
    message: string;
    is_deleted: boolean;
    read_by: number[];
    created_at: string;
    _pending?: boolean;
}

function fmtTime(ts: string) {
    if (!ts) return '';
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    if (diff < 604800000) return d.toLocaleDateString('en-KE', { weekday: 'short' });
    return d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}
function fmtDate(ts: string) {
    const d = new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 86400000) return 'TODAY';
    if (diff < 172800000) return 'YESTERDAY';
    return d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}
function roomKey(a: number, b: number) { return `direct_${Math.min(a,b)}_${Math.max(a,b)}`; }

const ROLE_COLOR: Record<string,string> = {
    admin:'#6366f1', principal:'#7c3aed', teacher:'#0d9488',
    bursar:'#d97706', parent:'#059669', student:'#2563eb',
};
const ROLE_LABEL: Record<string,string> = {
    admin:'Admin', principal:'Principal', teacher:'Teachers',
    bursar:'Bursar', parent:'Parents', student:'Students',
};
function rc(role:string){ return ROLE_COLOR[role?.toLowerCase()]||'#6366f1'; }

function Av({ name, size=42, role }: { name:string; size?:number; role?:string }) {
    const ini = (name||'?').split(' ').slice(0,2).map((w:string)=>w[0]?.toUpperCase()||'').join('');
    return (
        <div style={{ width:size, height:size, borderRadius:'50%', flexShrink:0,
            background:`linear-gradient(135deg,${rc(role||'')} 0%,${rc(role||'')}99 100%)`,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontWeight:900, fontSize:size*0.36,
            boxShadow:'0 2px 6px rgba(0,0,0,0.18)' }}>
            {ini}
        </div>
    );
}

// WhatsApp double ticks
function Ticks({ msg, myId }: { msg:ChatMessage; myId:number }) {
    if (msg._pending) return <span style={{fontSize:11,color:'#667781'}}>⏳</span>;
    const read = (msg.read_by||[]).filter(id=>id!==msg.sender_id).length > 0;
    return read ? (
        <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
            <polyline points="1,6 5,10 13,2" stroke="#53d0f5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <polyline points="5,6 9,10 17,2" stroke="#53d0f5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    ) : (
        <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
            <polyline points="1,6 5,10 13,2" stroke="#8696a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function TypingDots({ name }:{ name:string }) {
    return (
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0 8px' }}>
            <div style={{ background:'#fff', borderRadius:18, borderBottomLeftRadius:4,
                padding:'10px 14px', display:'flex', gap:4, alignItems:'center',
                boxShadow:'0 1px 4px rgba(0,0,0,0.1)' }}>
                {[0,1,2].map(i=>(
                    <span key={i} style={{ width:7,height:7,borderRadius:'50%',background:'#128C7E',display:'inline-block',
                        animation:`tdot 1.2s ease-in-out ${i*0.2}s infinite` }} />
                ))}
            </div>
            <span style={{ fontSize:12,color:'#128C7E',fontWeight:600 }}>{name.split(' ')[0]} is typing…</span>
        </div>
    );
}

export default function ChatPage() {
    const [contacts, setContacts]           = useState<Contact[]>([]);
    const [autoOpenContact, setAutoOpenContact] = useState<Contact|null>(null);
    const [messages, setMessages]           = useState<ChatMessage[]>([]);
    const [activeContact, setActiveContact] = useState<Contact|null>(null);
    const [activeRoomId, setActiveRoomId]   = useState<number|null>(null);
    const [text, setText]                   = useState('');
    const [searchQ, setSearchQ]             = useState('');
    const [loading, setLoading]             = useState(true);
    const [loadingMsgs, setLoadingMsgs]     = useState(false);
    const [sending, setSending]             = useState(false);
    const [currentUser, setCurrentUser]     = useState<any>(null);
    const [onlineIds, setOnlineIds]         = useState<Set<number>>(new Set());
    const [typingUsers, setTypingUsers]     = useState<Map<number,string>>(new Map());
    const typingTm   = useRef<Map<number,ReturnType<typeof setTimeout>>>(new Map());
    const channelRef = useRef<any>(null);
    const endRef     = useRef<HTMLDivElement>(null);
    const inputRef   = useRef<HTMLTextAreaElement>(null);

    // load current user
    useEffect(()=>{
        try { setCurrentUser(JSON.parse(localStorage.getItem('school_user')||'{}')); } catch {}
    },[]);

    // load contacts
    const loadContacts = useCallback(async()=>{
        if (!currentUser?.id) return;
        setLoading(true);

        // ── PARENT: skip contacts list, auto-open school admin inbox ──────────
        if (currentUser.role === 'parent') {
            const { data: admins } = await supabase
                .from('school_users')
                .select('id, full_name, username, role')
                .in('role', ['admin', 'principal'])
                .order('role').limit(1);
            const admin = admins?.[0];
            if (admin) {
                const schoolContact: Contact = { id: admin.id, full_name: admin.full_name, username: admin.username, role: admin.role, unread: 0 };
                setContacts([schoolContact]);
                setAutoOpenContact(schoolContact); // trigger auto-open via effect
            }
            setLoading(false);
            return;
        }


        const { data } = await supabase
            .from('school_users')
            .select('id, full_name, username, role')
            .neq('id', currentUser.id)
            .order('role').order('full_name');
        if (!data){ setLoading(false); return; }

        // fetch last msg for each
        const enriched: Contact[] = await Promise.all(data.map(async(u:any)=>{
            const { data: room } = await supabase
                .from('school_chat_rooms').select('id')
                .eq('room_name', roomKey(currentUser.id, u.id)).maybeSingle();
            let lastMessage='', lastTime='', unread=0;
            if (room?.id) {
                const { data: m } = await supabase
                    .from('school_chat_messages').select('message,created_at,sender_id,read_by')
                    .eq('room_id', room.id).eq('is_deleted', false)
                    .order('created_at',{ascending:false}).limit(1);
                if (m?.[0]) {
                    lastMessage = m[0].message?.slice(0,50)||'';
                    lastTime    = fmtTime(m[0].created_at);
                    if (m[0].sender_id!==currentUser.id && !(m[0].read_by||[]).includes(currentUser.id)) unread=1;
                }
            }
            return { ...u, lastMessage, lastTime, unread };
        }));
        setContacts(enriched);
        setLoading(false);
    },[currentUser?.id]);

    useEffect(()=>{ loadContacts(); },[loadContacts]);

    // open direct chat
    const openChat = useCallback(async(contact:Contact)=>{
        if (!currentUser?.id) return;
        setActiveContact(contact);
        setMessages([]);
        setTypingUsers(new Map());
        setLoadingMsgs(true);

        const key = roomKey(currentUser.id, contact.id);
        let { data: room } = await supabase
            .from('school_chat_rooms').select('id').eq('room_name', key).maybeSingle();
        if (!room) {
            const { data: nr } = await supabase
                .from('school_chat_rooms')
                .insert([{ room_type:'direct', room_name:key, is_active:true, created_by:currentUser.id }])
                .select('id').single();
            room = nr;
        }
        if (!room?.id){ setLoadingMsgs(false); return; }
        setActiveRoomId(room.id);

        const { data: msgs } = await supabase
            .from('school_chat_messages').select('*')
            .eq('room_id', room.id).eq('is_deleted', false)
            .order('created_at',{ascending:true}).limit(300);
        setMessages(msgs||[]);
        setLoadingMsgs(false);

        // mark as read
        for (const m of msgs||[]) {
            if (m.sender_id!==currentUser.id && !(m.read_by||[]).includes(currentUser.id))
                supabase.from('school_chat_messages').update({read_by:[...(m.read_by||[]),currentUser.id]}).eq('id',m.id).then(()=>{});
        }
        setContacts(prev=>prev.map(c=>c.id===contact.id?{...c,unread:0}:c));
        setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),120);
    },[currentUser]);

    // ── Auto-open for parent role (fires after openChat is defined) ─────────
    useEffect(()=>{
        if (autoOpenContact && currentUser?.id) {
            openChat(autoOpenContact);
            setAutoOpenContact(null);
        }
    },[autoOpenContact, openChat, currentUser?.id]);

    // realtime
    useEffect(()=>{
        if (!activeRoomId||!currentUser?.id) return;
        if (channelRef.current) supabase.removeChannel(channelRef.current);

        const ch = supabase.channel(`chat-${activeRoomId}`,{ config:{presence:{key:String(currentUser.id)}} })
            .on('presence',{event:'sync'},()=>{
                const state = ch.presenceState() as Record<string, any[]>;
                const ids = new Set<number>();
                Object.values(state).flat().forEach((p:any)=>{ if(p.user_id) ids.add(p.user_id); });
                setOnlineIds(ids);
            })
            .on('broadcast',{event:'typing'},({payload}:any)=>{
                const {user_id,user_name,is_typing}=payload;
                if(user_id===currentUser.id) return;
                if(is_typing){
                    setTypingUsers(p=>new Map(p).set(user_id,user_name));
                    const t=setTimeout(()=>setTypingUsers(p=>{const n=new Map(p);n.delete(user_id);return n;}),4000);
                    typingTm.current.set(user_id,t);
                } else {
                    setTypingUsers(p=>{const n=new Map(p);n.delete(user_id);return n;});
                }
            })
            .on('postgres_changes',{event:'INSERT',schema:'public',table:'school_chat_messages',filter:`room_id=eq.${activeRoomId}`},payload=>{
                const nm=payload.new as ChatMessage;
                setMessages(p=>p.find(m=>m.id===nm.id)?p:[...p,nm]);
                if(nm.sender_id!==currentUser.id)
                    supabase.from('school_chat_messages').update({read_by:[...(nm.read_by||[]),currentUser.id]}).eq('id',nm.id).then(()=>{});
                if(activeContact) setContacts(p=>p.map(c=>c.id===activeContact.id?{...c,lastMessage:nm.message?.slice(0,50),lastTime:'now'}:c));
                setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),80);
                setTypingUsers(p=>{const n=new Map(p);n.delete(nm.sender_id);return n;});
            })
            .on('postgres_changes',{event:'UPDATE',schema:'public',table:'school_chat_messages',filter:`room_id=eq.${activeRoomId}`},payload=>{
                const u=payload.new as ChatMessage;
                setMessages(p=>p.map(m=>m.id===u.id?{...m,read_by:u.read_by}:m));
            })
            .subscribe(async status=>{
                if(status==='SUBSCRIBED')
                    await ch.track({user_id:currentUser.id,user_name:currentUser.full_name||'User'});
            });

        channelRef.current=ch;
        return ()=>{ ch.untrack(); supabase.removeChannel(ch); };
    },[activeRoomId,currentUser,activeContact]);

    const broadcastTyping=(v:boolean)=>{
        if(!channelRef.current||!currentUser) return;
        channelRef.current.send({type:'broadcast',event:'typing',payload:{user_id:currentUser.id,user_name:currentUser.full_name||'User',is_typing:v}}).catch(()=>{});
    };

    const sendMessage = useCallback(async()=>{
        const t=text.trim();
        if(!t||!activeRoomId||!activeContact||!currentUser||sending) return;
        broadcastTyping(false);
        setSending(true);
        setText('');
        const tempId=-Date.now();
        const opt:ChatMessage={id:tempId,room_id:activeRoomId,sender_id:currentUser.id,
            sender_name:currentUser.full_name||'Me',sender_role:currentUser.role||'',
            message:t,is_deleted:false,read_by:[currentUser.id],created_at:new Date().toISOString(),_pending:true};
        setMessages(p=>[...p,opt]);
        setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),50);

        const { data } = await supabase.from('school_chat_messages').insert([{
            room_id:activeRoomId,sender_id:currentUser.id,
            sender_name:currentUser.full_name||'User',sender_role:currentUser.role||'',
            message:t,message_type:'text',is_deleted:false,
            read_by:[currentUser.id],created_at:new Date().toISOString()
        }]).select().single();

        setMessages(p=>p.map(m=>m.id===tempId?(data||{...m,_pending:false}):m));
        setContacts(p=>p.map(c=>c.id===activeContact.id?{...c,lastMessage:t.slice(0,50),lastTime:'now'}:c));
        setSending(false);

        try {
            await fetch('/api/push/send',{method:'POST',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({title:`💬 ${currentUser.full_name?.split(' ')[0]}`,message:t.slice(0,80),channelId:'apsims-chat',notificationType:'chat'})});
        } catch {}
        inputRef.current?.focus();
    },[text,activeRoomId,activeContact,currentUser,sending]);

    const onKey=(e:React.KeyboardEvent)=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage();} };

    const filtered = contacts.filter(c=>!searchQ||c.full_name?.toLowerCase().includes(searchQ.toLowerCase())||c.role?.toLowerCase().includes(searchQ.toLowerCase()));

    // group by role
    const grouped: Record<string,Contact[]>={};
    filtered.forEach(c=>{ const g=c.role||'other'; if(!grouped[g]) grouped[g]=[]; grouped[g].push(c); });
    const ROLE_ORDER=['admin','principal','teacher','bursar','parent','student'];
    const sortedGroups = Object.entries(grouped).sort(([a],[b])=>ROLE_ORDER.indexOf(a)-ROLE_ORDER.indexOf(b));

    const typingName = typingUsers.size>0 ? [...typingUsers.values()][0] : null;
    const contactOnline = activeContact ? onlineIds.has(activeContact.id) : false;

    return (
        <div style={{ display:'flex', height:'calc(100vh - 56px)', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', overflow:'hidden' }}>
            <style>{`
                @keyframes tdot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}}
                @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
                .crow:hover{background:#f5f6f6 !important;}
                .crow.active{background:#fff !important;}
                ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:4px}
                textarea{resize:none;outline:none;border:none;background:transparent;font-family:inherit;}
                input{outline:none;border:none;background:transparent;font-family:inherit;}
            `}</style>

            {/* ═══ LEFT: Contacts panel ═══════════════════════════════════ */}
            <div style={{ width:360,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid #e9edef',background:'#fff' }}>

                {/* Header bar */}
                <div style={{ padding:'10px 16px',background:'#f0f2f5',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #e9edef' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        {currentUser && <Av name={currentUser.full_name||'?'} size={40} role={currentUser.role} />}
                        <div>
                            <p style={{ fontWeight:800,fontSize:15,color:'#111b21',margin:0,lineHeight:1.2 }}>School Chat</p>
                            <p style={{ fontSize:11,color:'#128C7E',margin:0,fontWeight:600 }}>{currentUser?.full_name}</p>
                        </div>
                    </div>
                    <button style={{ background:'none',border:'none',cursor:'pointer',color:'#54656f',padding:6 }}>
                        <FiMoreVertical size={18} />
                    </button>
                </div>

                {/* Search bar */}
                <div style={{ padding:'8px 12px',borderBottom:'1px solid #f0f2f5',background:'#fff' }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,background:'#f0f2f5',borderRadius:8,padding:'7px 12px' }}>
                        <FiSearch size={14} color="#54656f" style={{ flexShrink:0 }} />
                        <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                            placeholder="Search by name or role…"
                            style={{ flex:1,fontSize:14,color:'#111b21' }} />
                    </div>
                </div>

                {/* Contacts */}
                <div style={{ flex:1,overflowY:'auto' }}>
                    {loading ? (
                        <div style={{ padding:40,textAlign:'center',color:'#667781',fontSize:13 }}>Loading contacts…</div>
                    ) : contacts.length===0 ? (
                        <div style={{ padding:40,textAlign:'center' }}>
                            <div style={{ fontSize:48,marginBottom:8 }}>👥</div>
                            <p style={{ color:'#667781',fontSize:13 }}>No contacts found</p>
                        </div>
                    ) : sortedGroups.map(([role, list])=>(
                        <div key={role}>
                            <div style={{ padding:'8px 16px 3px',fontSize:11,fontWeight:800,color:'#128C7E',letterSpacing:.8,textTransform:'uppercase',background:'#f9fafb' }}>
                                {ROLE_LABEL[role]||role}
                            </div>
                            {list.map(contact=>{
                                const isActive = activeContact?.id===contact.id;
                                const online   = onlineIds.has(contact.id);
                                return (
                                    <div key={contact.id} className={`crow${isActive?' active':''}`}
                                        onClick={()=>openChat(contact)}
                                        style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 16px',cursor:'pointer',
                                            background:isActive?'#fff':'transparent',
                                            borderBottom:'1px solid #f0f2f5',
                                            borderLeft:isActive?'3px solid #128C7E':'3px solid transparent',
                                            transition:'all .12s' }}>
                                        <div style={{ position:'relative',flexShrink:0 }}>
                                            <Av name={contact.full_name} size={48} role={contact.role} />
                                            {online && <div style={{ position:'absolute',bottom:1,right:1,width:12,height:12,borderRadius:'50%',background:'#25D366',border:'2px solid #fff' }} />}
                                        </div>
                                        <div style={{ flex:1,minWidth:0 }}>
                                            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',gap:4 }}>
                                                <p style={{ fontWeight:600,fontSize:15,color:'#111b21',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                                                    {contact.full_name}
                                                </p>
                                                {contact.lastTime && (
                                                    <span style={{ fontSize:11,color:contact.unread>0?'#25D366':'#667781',flexShrink:0 }}>
                                                        {contact.lastTime}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                                                <p style={{ fontSize:13,color:'#667781',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>
                                                    {contact.lastMessage||<span style={{ fontStyle:'italic',color:'#b0b8c1',fontSize:12 }}>Tap to chat</span>}
                                                </p>
                                                {contact.unread>0 && (
                                                    <div style={{ width:19,height:19,borderRadius:'50%',background:'#25D366',color:'#fff',fontSize:10,fontWeight:900,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginLeft:6 }}>
                                                        {contact.unread}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* ═══ RIGHT: Chat panel ══════════════════════════════════════ */}
            {!activeContact ? (
                <div style={{ flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'#f0f2f5',gap:12 }}>
                    <div style={{ fontSize:80,lineHeight:1 }}>💬</div>
                    <h2 style={{ fontWeight:800,fontSize:24,color:'#41525d',margin:0 }}>APSIMS School Chat</h2>
                    <p style={{ color:'#667781',fontSize:14,textAlign:'center',maxWidth:360,lineHeight:1.6 }}>
                        Select a contact on the left to start a direct conversation.<br/>
                        Parents can message teachers, principals and school admin directly.
                    </p>
                    <div style={{ display:'flex',gap:8,flexWrap:'wrap',justifyContent:'center',marginTop:8 }}>
                        {['👨‍👩‍👧 Parent ↔ Teacher','🎓 Parent ↔ Principal','💰 Parent ↔ Bursar','👨‍🏫 Teacher ↔ Admin'].map(l=>(
                            <span key={l} style={{ background:'#fff',border:'1px solid #d1d7db',borderRadius:20,padding:'5px 14px',fontSize:12,color:'#54656f',fontWeight:600,boxShadow:'0 1px 3px rgba(0,0,0,0.06)' }}>{l}</span>
                        ))}
                    </div>
                </div>
            ) : (
                <div style={{ flex:1,display:'flex',flexDirection:'column',minWidth:0 }}>

                    {/* Chat header */}
                    <div style={{ padding:'8px 16px',background:'#f0f2f5',display:'flex',alignItems:'center',gap:12,borderBottom:'1px solid #e9edef',minHeight:58 }}>
                        <button onClick={()=>setActiveContact(null)} style={{ background:'none',border:'none',cursor:'pointer',color:'#54656f',padding:'4px 8px 4px 0',display:'flex',alignItems:'center' }}>
                            <FiArrowLeft size={20} />
                        </button>
                        <div style={{ position:'relative' }}>
                            <Av name={activeContact.full_name} size={42} role={activeContact.role} />
                            {contactOnline && <div style={{ position:'absolute',bottom:1,right:1,width:11,height:11,borderRadius:'50%',background:'#25D366',border:'2px solid #f0f2f5' }} />}
                        </div>
                        <div style={{ flex:1 }}>
                            <p style={{ fontWeight:700,fontSize:15,color:'#111b21',margin:0 }}>{activeContact.full_name}</p>
                            <p style={{ fontSize:12,margin:0,fontWeight:600,
                                color:typingName?'#128C7E':contactOnline?'#128C7E':'#667781' }}>
                                {typingName?'typing…':contactOnline?'online':ROLE_LABEL[activeContact.role]||activeContact.role}
                            </p>
                        </div>
                        <div style={{ display:'flex',gap:4 }}>
                            <button style={{ background:'none',border:'none',cursor:'pointer',color:'#54656f',padding:8 }} title="Voice call"><FiPhone size={19}/></button>
                            <button style={{ background:'none',border:'none',cursor:'pointer',color:'#54656f',padding:8 }} title="Video call"><FiVideo size={19}/></button>
                            <button style={{ background:'none',border:'none',cursor:'pointer',color:'#54656f',padding:8 }}><FiMoreVertical size={19}/></button>
                        </div>
                    </div>

                    {/* Messages — WhatsApp wallpaper */}
                    <div style={{
                        flex:1,overflowY:'auto',padding:'12px 5% 8px',display:'flex',flexDirection:'column',gap:1,
                        backgroundColor:'#efeae2',
                        backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cdefs%3E%3Cpattern id='p' width='80' height='80' patternUnits='userSpaceOnUse'%3E%3Ccircle cx='8' cy='8' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3Ccircle cx='40' cy='8' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3Ccircle cx='72' cy='8' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3Ccircle cx='24' cy='24' r='1' fill='%23c8bfb0' opacity='0.4'/%3E%3Ccircle cx='56' cy='24' r='1' fill='%23c8bfb0' opacity='0.4'/%3E%3Ccircle cx='8' cy='40' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%23c8bfb0' opacity='0.35'/%3E%3Ccircle cx='72' cy='40' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3Ccircle cx='24' cy='56' r='1' fill='%23c8bfb0' opacity='0.4'/%3E%3Ccircle cx='56' cy='56' r='1' fill='%23c8bfb0' opacity='0.4'/%3E%3Ccircle cx='8' cy='72' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3Ccircle cx='40' cy='72' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3Ccircle cx='72' cy='72' r='1.2' fill='%23c8bfb0' opacity='0.5'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='80' height='80' fill='url(%23p)'/%3E%3C/svg%3E")`,
                        backgroundRepeat:'repeat',
                    }}>
                        {loadingMsgs ? (
                            <div style={{ display:'flex',justifyContent:'center',paddingTop:48 }}>
                                <div style={{ background:'rgba(255,255,255,0.88)',borderRadius:12,padding:'12px 28px',fontSize:13,color:'#667781',boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
                                    Loading messages…
                                </div>
                            </div>
                        ) : messages.length===0 ? (
                            <div style={{ display:'flex',justifyContent:'center',paddingTop:48 }}>
                                <div style={{ background:'rgba(255,255,255,0.88)',borderRadius:12,padding:'12px 28px',fontSize:13,color:'#667781',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
                                    🔒 End-to-end secured &nbsp;·&nbsp; Say hello to {activeContact.full_name.split(' ')[0]}! 👋
                                </div>
                            </div>
                        ) : (
                            messages.map((msg,idx)=>{
                                const isMe = msg.sender_id===currentUser?.id;
                                const prev = messages[idx-1];
                                const showDate = !prev||fmtDate(prev.created_at)!==fmtDate(msg.created_at);
                                return (
                                    <React.Fragment key={msg.id}>
                                        {showDate && (
                                            <div style={{ display:'flex',justifyContent:'center',margin:'14px 0 8px' }}>
                                                <span style={{ background:'rgba(255,255,255,0.88)',borderRadius:8,padding:'3px 12px',fontSize:11,color:'#54656f',fontWeight:700,letterSpacing:.4,boxShadow:'0 1px 2px rgba(0,0,0,0.08)' }}>
                                                    {fmtDate(msg.created_at)}
                                                </span>
                                            </div>
                                        )}
                                        <div style={{ display:'flex',justifyContent:isMe?'flex-end':'flex-start',marginBottom:2,animation:'msgIn .15s ease' }}>
                                            <div style={{
                                                maxWidth:'65%',
                                                borderRadius:isMe?'12px 12px 3px 12px':'12px 12px 12px 3px',
                                                padding:'6px 10px 5px',
                                                background:isMe?'#d9fdd3':'#ffffff',
                                                boxShadow:'0 1px 2px rgba(0,0,0,0.12)',
                                            }}>
                                                {!isMe && (
                                                    <p style={{ fontSize:11,fontWeight:800,color:rc(msg.sender_role),margin:'0 0 2px' }}>
                                                        {msg.sender_name}
                                                    </p>
                                                )}
                                                <p style={{ fontSize:14.5,color:'#111b21',margin:0,lineHeight:1.5,wordBreak:'break-word',whiteSpace:'pre-wrap' }}>
                                                    {msg.is_deleted?<em style={{color:'#667781'}}>This message was deleted</em>:msg.message}
                                                </p>
                                                <div style={{ display:'flex',alignItems:'center',gap:3,justifyContent:'flex-end',marginTop:3 }}>
                                                    <span style={{ fontSize:10.5,color:'#667781',whiteSpace:'nowrap' }}>
                                                        {new Date(msg.created_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})}
                                                    </span>
                                                    {isMe && <Ticks msg={msg} myId={currentUser?.id??-1} />}
                                                </div>
                                            </div>
                                        </div>
                                    </React.Fragment>
                                );
                            })
                        )}
                        {typingName && <TypingDots name={typingName} />}
                        <div ref={endRef} />
                    </div>

                    {/* Input bar — WhatsApp exact */}
                    <div style={{ padding:'8px 14px',background:'#f0f2f5',display:'flex',alignItems:'flex-end',gap:10,borderTop:'1px solid #e9edef' }}>
                        <div style={{ flex:1,display:'flex',alignItems:'flex-end',background:'#fff',borderRadius:24,padding:'8px 16px',gap:8,boxShadow:'0 1px 3px rgba(0,0,0,0.08)',minHeight:44 }}>
                            <button style={{ background:'none',border:'none',cursor:'pointer',color:'#54656f',padding:'2px 0',flexShrink:0 }}>
                                <FiSmile size={22} />
                            </button>
                            <textarea
                                ref={inputRef}
                                value={text}
                                onChange={e=>{ setText(e.target.value); broadcastTyping(e.target.value.length>0); }}
                                onKeyDown={onKey}
                                placeholder={`Message ${activeContact.full_name.split(' ')[0]}…`}
                                rows={1}
                                style={{ flex:1,fontSize:15,color:'#111b21',lineHeight:1.5,maxHeight:120,paddingTop:1 }}
                            />
                            <button style={{ background:'none',border:'none',cursor:'pointer',color:'#54656f',padding:'2px 0',flexShrink:0 }}>
                                <FiPaperclip size={20} />
                            </button>
                        </div>
                        <button
                            onClick={sendMessage}
                            disabled={sending||!text.trim()}
                            style={{ width:48,height:48,borderRadius:'50%',border:'none',cursor:text.trim()?'pointer':'default',
                                background:'#128C7E',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',
                                boxShadow:'0 2px 8px rgba(18,140,126,0.5)',flexShrink:0,
                                opacity:sending?0.7:1,transition:'all .15s',transform:text.trim()?'scale(1)':'scale(0.92)' }}>
                            {text.trim() ? <BsSend size={18} style={{marginLeft:2}}/> : <span style={{fontSize:20}}>🎙️</span>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

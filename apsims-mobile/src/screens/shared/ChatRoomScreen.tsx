import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, TextInput,
    StyleSheet, KeyboardAvoidingView, Platform, StatusBar,
    ActivityIndicator, Animated, Easing, Vibration, Pressable, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EmojiKeyboard from 'rn-emoji-keyboard';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
    id: number;
    room_id: number;
    sender_id: number;
    sender_name: string;
    sender_role: string;
    message: string;
    message_type: 'text' | 'image' | 'audio' | 'file' | 'announcement';
    is_deleted: boolean;
    read_by: number[];
    created_at: string;
    _pending?: boolean; // local optimistic message
}

interface ChatRoom {
    id: number;
    room_type: string;
    room_name: string;
}

// ─── WhatsApp Tick Component ──────────────────────────────────────────────────
type TickStatus = 'sending' | 'sent' | 'read';

function getTickStatus(msg: ChatMessage, myId: number): TickStatus {
    if (msg._pending) return 'sending';
    const others = (msg.read_by || []).filter(id => id !== msg.sender_id);
    if (others.length > 0) return 'read';
    return 'sent';
}

function Ticks({ status }: { status: TickStatus }) {
    const spinAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (status === 'sending') {
            Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.linear })).start();
        }
    }, [status]);
    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    if (status === 'sending') return (
        <Animated.View style={[styles.tick, { transform: [{ rotate: spin }] }]}>
            <View style={styles.spinnerRing} />
        </Animated.View>
    );
    if (status === 'sent') return (
        // Single grey tick
        <View style={styles.tickRow}>
            <Text style={[styles.tickChar, { color: 'rgba(255,255,255,0.55)' }]}>✓</Text>
        </View>
    );
    // Read — double blue ticks
    return (
        <View style={styles.tickRow}>
            <Text style={[styles.tickChar, styles.tickDouble, { color: '#53c1f5' }]}>✓</Text>
            <Text style={[styles.tickChar, styles.tickDouble, { color: '#53c1f5', marginLeft: -4 }]}>✓</Text>
        </View>
    );
}

// ─── Typing Bubble ────────────────────────────────────────────────────────────
function TypingBubble({ names }: { names: string[] }) {
    const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
    useEffect(() => {
        dots.forEach((dot, i) => {
            Animated.loop(Animated.sequence([
                Animated.delay(i * 200),
                Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
                Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
                Animated.delay(600),
            ])).start();
        });
    }, []);
    return (
        <View style={styles.typingContainer}>
            <View style={styles.typingBubble}>
                <View style={styles.typingDotRow}>
                    {dots.map((dot, i) => (
                        <Animated.View key={i} style={[styles.typingDot, { transform: [{ translateY: dot }] }]} />
                    ))}
                </View>
            </View>
            <Text style={styles.typingLabel}>{names.join(', ')} {names.length === 1 ? 'is' : 'are'} typing…</Text>
        </View>
    );
}

// ─── Format timestamp ─────────────────────────────────────────────────────────
function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(ts: string) {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Avatar mini ──────────────────────────────────────────────────────────────
function MiniAvatar({ name, size = 28 }: { name: string; size?: number }) {
    const ini = (name || '?').split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');
    return (
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={[styles.miniAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={{ color: '#fff', fontWeight: '900', fontSize: size * 0.38 }}>{ini}</Text>
        </LinearGradient>
    );
}

// ─── PREMIUM GLASS BUBBLE WALLPAPER ─────────────────────────────────────────
const BUBBLES = [
    { x: -30,  y: -40,  r: 130, color: 'rgba(255,180,150,0.55)' },
    { x: 200,  y: -60,  r: 100, color: 'rgba(255,160,130,0.4)'  },
    { x: 280,  y: 80,   r: 80,  color: 'rgba(255,200,180,0.35)' },
    { x: 60,   y: 100,  r: 60,  color: 'rgba(255,220,200,0.3)'  },
    { x: 150,  y: 180,  r: 45,  color: 'rgba(200,230,255,0.4)'  },
    { x: 20,   y: 250,  r: 35,  color: 'rgba(180,220,250,0.35)' },
    { x: 310,  y: 260,  r: 55,  color: 'rgba(160,210,240,0.4)'  },
    { x: 100,  y: 340,  r: 90,  color: 'rgba(140,200,235,0.45)' },
    { x: 260,  y: 380,  r: 40,  color: 'rgba(200,230,255,0.35)' },
    { x: -20,  y: 420,  r: 70,  color: 'rgba(150,210,240,0.4)'  },
    { x: 330,  y: 480,  r: 110, color: 'rgba(130,200,235,0.5)'  },
    { x: 80,   y: 530,  r: 50,  color: 'rgba(180,225,250,0.4)'  },
    { x: 210,  y: 600,  r: 75,  color: 'rgba(160,215,245,0.45)' },
    { x: -10,  y: 650,  r: 95,  color: 'rgba(120,195,235,0.4)'  },
    { x: 290,  y: 700,  r: 60,  color: 'rgba(170,220,248,0.38)' },
    // Small glass droplets
    { x: 180,  y: 70,   r: 18,  color: 'rgba(180,230,255,0.6)'  },
    { x: 240,  y: 150,  r: 12,  color: 'rgba(200,240,255,0.55)' },
    { x: 50,   y: 190,  r: 15,  color: 'rgba(255,210,195,0.5)'  },
    { x: 340,  y: 350,  r: 20,  color: 'rgba(170,220,250,0.55)' },
    { x: 130,  y: 460,  r: 14,  color: 'rgba(190,230,255,0.5)'  },
    { x: 370,  y: 580,  r: 16,  color: 'rgba(160,215,245,0.5)'  },
];

function ChatWallpaper() {
    return (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <LinearGradient
                colors={['#ffcbb8', '#ffddd4', '#eef6fb', '#c5e8f8', '#a8d8f0']}
                start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFillObject}
            />
            {BUBBLES.map((b, i) => (
                <View key={i} style={{
                    position: 'absolute', left: b.x, top: b.y,
                    width: b.r * 2, height: b.r * 2, borderRadius: b.r,
                    backgroundColor: b.color,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.5)',
                    shadowColor: '#fff', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: -4, height: -4 },
                }} />
            ))}
        </View>
    );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function ChatRoomScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const room: ChatRoom = route.params?.room;
    const contact = route.params?.contact; // { id, full_name, role }
    const displayName = contact?.full_name || room?.room_name || 'Chat';

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [text, setText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [onlineCount, setOnlineCount] = useState(0);
    const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
    const flatListRef = useRef<FlatList>(null);
    const channelRef = useRef<any>(null);
    const typingTimeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
    const inputRef = useRef<TextInput>(null);

    // ── Load current user from SecureStore (correct session store) ─────────────
    useEffect(() => {
        import('expo-secure-store').then(SecureStore => {
            SecureStore.getItemAsync('apsims_session_v2').then(raw => {
                try { if (raw) { const s = JSON.parse(raw); setCurrentUser({ id: s.portal_user_id, full_name: s.full_name, role: s.user_type || s.role || 'staff' }); } }
                catch { AsyncStorage.getItem('apsims_session_v2').then(r2 => { try { if (r2) { const s = JSON.parse(r2); setCurrentUser({ id: s.portal_user_id, full_name: s.full_name, role: s.user_type || s.role || 'staff' }); } } catch {} }); }
            });
        });
    }, []);

    // ── Load messages ─────────────────────────────────────────────────────────
    const loadMessages = useCallback(async () => {
        if (!room?.id) return;
        const { data } = await supabase
            .from('school_chat_messages')
            .select('*')
            .eq('room_id', room.id)
            .eq('is_deleted', false)
            .order('created_at', { ascending: true })
            .limit(200);
        setMessages(data || []);
        setLoading(false);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }, [room?.id]);

    useEffect(() => { loadMessages(); }, [loadMessages]);

    // ── Mark as read ──────────────────────────────────────────────────────────
    const markAsRead = useCallback(async () => {
        if (!currentUser?.id || !room?.id) return;
        const { data: unread } = await supabase
            .from('school_chat_messages')
            .select('id, read_by')
            .eq('room_id', room.id)
            .neq('sender_id', currentUser.id)
            .eq('is_deleted', false);
        for (const msg of unread || []) {
            if (!(msg.read_by || []).includes(currentUser.id)) {
                supabase.from('school_chat_messages')
                    .update({ read_by: [...(msg.read_by || []), currentUser.id] })
                    .eq('id', msg.id)
                    .then(() => {});
            }
        }
    }, [currentUser, room?.id]);

    useEffect(() => { if (currentUser) markAsRead(); }, [currentUser, markAsRead]);

    // ── Supabase Realtime: Presence + Typing Broadcast + Messages ─────────────
    useEffect(() => {
        if (!room?.id || !currentUser?.id) return;

        const channel = supabase.channel(`chat-room-${room.id}`, {
            config: { presence: { key: String(currentUser.id) } },
        })
        // Presence
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            setOnlineCount(Object.keys(state).length);
        })
        // Typing broadcast
        .on('broadcast', { event: 'typing' }, ({ payload }: any) => {
            const { user_id, user_name, is_typing } = payload;
            if (user_id === currentUser.id) return;
            if (is_typing) {
                setTypingUsers(prev => new Map(prev).set(user_id, user_name));
                const existing = typingTimeouts.current.get(user_id);
                if (existing) clearTimeout(existing);
                const t = setTimeout(() => {
                    setTypingUsers(prev => { const n = new Map(prev); n.delete(user_id); return n; });
                }, 4000);
                typingTimeouts.current.set(user_id, t);
            } else {
                setTypingUsers(prev => { const n = new Map(prev); n.delete(user_id); return n; });
            }
        })
        // New messages
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'school_chat_messages', filter: `room_id=eq.${room.id}` }, payload => {
            const newMsg = payload.new as ChatMessage;
            setMessages(prev => prev.find(m => m.id === newMsg.id) ? prev : [...prev, newMsg]);
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 80);
            setTypingUsers(prev => { const n = new Map(prev); n.delete(newMsg.sender_id); return n; });
            // Vibrate gently for incoming messages
            if (newMsg.sender_id !== currentUser.id) Vibration.vibrate(50);
        })
        // Read receipt updates (tick upgrade)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'school_chat_messages', filter: `room_id=eq.${room.id}` }, payload => {
            const updated = payload.new as ChatMessage;
            setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, read_by: updated.read_by } : m));
        })
        .subscribe(async status => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: currentUser.id,
                    user_name: currentUser.full_name || 'User',
                    online_at: new Date().toISOString(),
                });
            }
        });

        channelRef.current = channel;
        return () => { channel.untrack(); supabase.removeChannel(channel); };
    }, [room?.id, currentUser]);

    // ── Broadcast typing ──────────────────────────────────────────────────────
    const broadcastTyping = useCallback((isTyping: boolean) => {
        if (!channelRef.current || !currentUser) return;
        channelRef.current.send({
            type: 'broadcast', event: 'typing',
            payload: { user_id: currentUser.id, user_name: currentUser.full_name || 'User', is_typing: isTyping },
        }).catch(() => {});
    }, [currentUser]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback(async () => {
        const trimmed = text.trim();
        if (!trimmed || !room?.id || !currentUser) return;
        broadcastTyping(false);
        setText('');

        // Optimistic local message
        const tempId = -Date.now();
        const optimistic: ChatMessage = {
            id: tempId, room_id: room.id, sender_id: currentUser.id,
            sender_name: currentUser.full_name || 'Me', sender_role: currentUser.role || '',
            message: trimmed, message_type: 'text', is_deleted: false,
            read_by: [currentUser.id], created_at: new Date().toISOString(), _pending: true,
        };
        setMessages(prev => [...prev, optimistic]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

        const { data, error } = await supabase.from('school_chat_messages').insert([{
            room_id: room.id, sender_id: currentUser.id,
            sender_name: currentUser.full_name || 'User', sender_role: currentUser.role || 'staff',
            message: trimmed, message_type: 'text', is_deleted: false,
            read_by: [currentUser.id], created_at: new Date().toISOString(),
        }]).select().single();

        // Replace optimistic with real
        setMessages(prev => prev.map(m => m.id === tempId ? (data || m) : m).map(m => m.id === tempId ? { ...m, _pending: false } : m));

        // Push notification
        if (!error) {
            fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: `💬 ${room.room_name}`,
                    message: `${currentUser.full_name?.split(' ')[0] || 'User'}: ${trimmed.slice(0, 80)}`,
                    channelId: 'apsims-chat', sound: 'message-pop',
                    notificationType: 'chat', data: { roomId: room.id },
                }),
            }).catch(() => {});
        }
    }, [text, room, currentUser, broadcastTyping]);

    // ── Attachment: image gallery or document picker ───────────────────────────
    const sendAttachment = useCallback(async () => {
        if (!room?.id || !currentUser) return;
        Alert.alert('Attach', 'Choose attachment type', [
            {
                text: '📷 Photo / Image', onPress: async () => {
                    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (!perm.granted) { Alert.alert('Permission required', 'Allow photo access to attach images.'); return; }
                    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
                    if (result.canceled || !result.assets?.[0]) return;
                    const asset = result.assets[0];
                    const filename = asset.uri.split('/').pop() || `img_${Date.now()}.jpg`;
                    const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
                    const path = `chat/${room.id}/${Date.now()}_${filename}`;
                    const resp = await fetch(asset.uri);
                    const blob = await resp.blob();
                    const { error } = await supabase.storage.from('apsims-chat').upload(path, blob, { contentType: `image/${ext}`, upsert: true });
                    if (error) { Alert.alert('Upload failed', error.message); return; }
                    const { data: { publicUrl } } = supabase.storage.from('apsims-chat').getPublicUrl(path);
                    await supabase.from('school_chat_messages').insert([{
                        room_id: room.id, sender_id: currentUser.id,
                        sender_name: currentUser.full_name || 'User', sender_role: currentUser.role || 'staff',
                        message: `📷 [Image](${publicUrl})`, message_type: 'image',
                        is_deleted: false, read_by: [currentUser.id], created_at: new Date().toISOString(),
                    }]);
                }
            },
            {
                text: '📎 Document / File', onPress: async () => {
                    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
                    if (result.canceled || !result.assets?.[0]) return;
                    const asset = result.assets[0];
                    const path = `chat/${room.id}/${Date.now()}_${asset.name.replace(/\s+/g,'_')}`;
                    const resp = await fetch(asset.uri);
                    const blob = await resp.blob();
                    const { error } = await supabase.storage.from('apsims-chat').upload(path, blob, { contentType: asset.mimeType || 'application/octet-stream', upsert: true });
                    if (error) { Alert.alert('Upload failed', error.message); return; }
                    const { data: { publicUrl } } = supabase.storage.from('apsims-chat').getPublicUrl(path);
                    await supabase.from('school_chat_messages').insert([{
                        room_id: room.id, sender_id: currentUser.id,
                        sender_name: currentUser.full_name || 'User', sender_role: currentUser.role || 'staff',
                        message: `📎 [${asset.name}](${publicUrl})`, message_type: 'file',
                        is_deleted: false, read_by: [currentUser.id], created_at: new Date().toISOString(),
                    }]);
                }
            },
            { text: 'Cancel', style: 'cancel' },
        ]);
    }, [room, currentUser]);

    // ── Group messages by date ────────────────────────────────────────────────
    const renderItem = useCallback(({ item: msg, index }: { item: ChatMessage; index: number }) => {
        const isMe = msg.sender_id === currentUser?.id;
        const prevMsg = messages[index - 1];
        const showAvatar = !isMe && (!prevMsg || prevMsg.sender_id !== msg.sender_id);
        const showName = showAvatar;
        const showDate = !prevMsg || formatDate(prevMsg.created_at) !== formatDate(msg.created_at);
        const tickStatus = getTickStatus(msg, currentUser?.id ?? -1);

        return (
            <>
                {/* Date divider */}
                {showDate && (
                    <View style={styles.dateDivider}>
                        <View style={styles.dateLine} />
                        <View style={styles.datePill}>
                            <Text style={styles.dateText}>{formatDate(msg.created_at)}</Text>
                        </View>
                        <View style={styles.dateLine} />
                    </View>
                )}

                <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
                    {/* Avatar for others */}
                    {!isMe && (
                        <View style={styles.avatarCol}>
                            {showAvatar ? <MiniAvatar name={msg.sender_name} /> : <View style={{ width: 28 }} />}
                        </View>
                    )}

                    <View style={[styles.msgGroup, isMe ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                        {/* Sender name */}
                        {showName && !isMe && (
                            <Text style={styles.senderName}>{msg.sender_name} · <Text style={styles.senderRole}>{msg.sender_role}</Text></Text>
                        )}

                        {/* Bubble */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.bubble,
                                isMe ? styles.bubbleMe : styles.bubbleThem,
                                pressed && { opacity: 0.85 },
                            ]}
                        >
                            {isMe ? (
                                <LinearGradient
                                    colors={['#6366f1', '#8b5cf6']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={styles.bubbleGradient}
                                >
                                    {msg.message_type === 'announcement' && (
                                        <Text style={styles.announcementLabel}>📢 ANNOUNCEMENT</Text>
                                    )}
                                    <Text style={styles.msgTextMe}>{msg.message}</Text>
                                    {/* Time + Ticks */}
                                    <View style={styles.msgMeta}>
                                        <Text style={styles.msgTimeMe}>{formatTime(msg.created_at)}</Text>
                                        <Ticks status={tickStatus} />
                                    </View>
                                </LinearGradient>
                            ) : (
                                <View style={styles.bubbleThemInner}>
                                    {msg.message_type === 'announcement' && (
                                        <Text style={styles.announcementLabelThem}>📢 ANNOUNCEMENT</Text>
                                    )}
                                    <Text style={styles.msgTextThem}>{msg.message}</Text>
                                    <View style={styles.msgMeta}>
                                        <Text style={styles.msgTimeThem}>{formatTime(msg.created_at)}</Text>
                                    </View>
                                </View>
                            )}
                        </Pressable>
                    </View>
                </View>
            </>
        );
    }, [messages, currentUser]);

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffe0d4" />

            {/* ── PREMIUM HEADER ── */}
            <LinearGradient
                colors={['#ffe0d4', '#ffd4c8', '#e8f5fc']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <TouchableOpacity
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                            return;
                        }
                        // Use route params for immediate nav (no async needed)
                        const isParent = route.params?.isParentDirectInbox;
                        const role = currentUser?.role || route.params?.userRole || '';
                        if (isParent || role === 'parent') {
                            navigation.navigate('ParentTabs' as any);
                        } else if (role === 'teacher') {
                            navigation.navigate('TeacherTabs' as any);
                        } else if (role === 'student') {
                            navigation.navigate('StudentTabs' as any);
                        } else if (role === 'bursar') {
                            navigation.navigate('BursarTabs' as any);
                        } else if (role === 'principal') {
                            navigation.navigate('PrincipalTabs' as any);
                        } else {
                            // Last resort — go to ChatList if it's in stack, else ParentTabs
                            try { navigation.navigate('ChatList' as any); }
                            catch { navigation.navigate('ParentTabs' as any); }
                        }
                    }}
                    style={styles.backBtn}
                >
                    <Text style={styles.backArrow}>‹</Text>
                </TouchableOpacity>

                <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,120,80,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,120,80,0.35)' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#c0392b' }}>
                        {(displayName || 'C').charAt(0).toUpperCase()}
                    </Text>
                </View>

                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>{displayName}</Text>
                    {/* Online / Typing status */}
                    {typingUsers.size > 0 ? (
                        <View style={styles.statusRow}>
                            <View style={styles.typingDotRowInline}>
                                {[0, 1, 2].map(i => <View key={i} style={styles.typingDotInline} />)}
                            </View>
                            <Text style={styles.typingText}>
                                {[...typingUsers.values()].map(n => n.split(' ')[0]).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing…
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.statusRow}>
                            <View style={[styles.onlineDot, { backgroundColor: onlineCount > 1 ? '#10b981' : '#94a3b8' }]} />
                            <Text style={[styles.statusText, { color: onlineCount > 1 ? '#059669' : '#64748b' }]}>
                                {onlineCount > 1 ? `${onlineCount} online` : 'School Chat'}
                            </Text>
                        </View>
                    )}
                </View>

                {/* LIVE badge */}
                <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </LinearGradient>

            {/* ── MESSAGES + WALLPAPER ── */}
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                {/* WhatsApp wallpaper background */}
                <View style={styles.wallpaper} pointerEvents='box-none'>
                    <View style={styles.wallpaperBg} />
                    <ChatWallpaper />

                    {loading ? (
                        <View style={styles.center}>
                            <ActivityIndicator color="#6366f1" size="large" />
                            <Text style={styles.loadingText}>Loading messages…</Text>
                        </View>
                    ) : (
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={item => String(item.id)}
                            renderItem={renderItem}
                            contentContainerStyle={styles.messageList}
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
                            ListEmptyComponent={
                                <View style={styles.emptyChat}>
                                    <Text style={styles.emptyChatEmoji}>👋</Text>
                                    <Text style={styles.emptyChatTitle}>Say hello!</Text>
                                    <Text style={styles.emptyChatSub}>Be the first to send a message</Text>
                                </View>
                            }
                        />
                    )}

                    {/* Typing bubble */}
                    {typingUsers.size > 0 && (
                        <TypingBubble names={[...typingUsers.values()].map(n => n.split(' ')[0])} />
                    )}
                </View>

                {/* ── INPUT BAR ── */}
                <View style={styles.inputBar}>
                    <View style={styles.inputWrap}>
                        <TouchableOpacity style={styles.iconBtn} onPress={() => { setShowEmoji(v => !v); inputRef.current?.blur(); }}>
                            <Text style={[styles.iconText, showEmoji && { color: '#6366f1' }]}>😊</Text>
                        </TouchableOpacity>
                        <TextInput
                            ref={inputRef}
                            value={text}
                            onChangeText={val => { setText(val); broadcastTyping(val.length > 0); }}
                            onFocus={() => setShowEmoji(false)}
                            placeholder={`Message ${displayName}…`}
                            placeholderTextColor="#94a3b8"
                            style={styles.textInput}
                            multiline
                            maxLength={2000}
                            blurOnSubmit={false}
                        />
                        <TouchableOpacity style={styles.iconBtn} onPress={sendAttachment}>
                            <Text style={styles.iconText}>📎</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Send / Mic button */}
                    {text.trim() ? (
                        <TouchableOpacity onPress={sendMessage} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#6366f1', '#8b5cf6']}
                                style={styles.sendBtn}
                            >
                                <Text style={styles.sendIcon}>➤</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity activeOpacity={0.8} style={styles.micBtn}>
                            <Text style={styles.micIcon}>🎙️</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* ── Emoji Keyboard (slides up from bottom) ── */}
            <EmojiKeyboard
                onEmojiSelected={(emoji: any) => setText(prev => prev + (emoji.emoji || emoji))}
                open={showEmoji}
                onClose={() => setShowEmoji(false)}
                enableSearchBar
                categoryOrder={['recently_used','smileys_people','animals_nature','food_drink','travel_places','activities','objects','symbols','flags']}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffcbb8' },

    // Header
    header: { paddingTop: Platform.OS === 'ios' ? 54 : 40, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    backArrow: { color: '#1a1a2e', fontSize: 32, fontWeight: '300', marginTop: -4 },
    headerRoom: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    headerRoomIcon: { fontSize: 22 },
    headerInfo: { flex: 1 },
    headerTitle: { color: '#1a1a2e', fontWeight: '900', fontSize: 15 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
    onlineDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    typingText: { fontSize: 11, fontWeight: '700', color: '#a5b4fc' },
    typingDotRowInline: { flexDirection: 'row', gap: 2, alignItems: 'center' },
    typingDotInline: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#818cf8' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.15)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
    liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#10b981' },
    liveText: { color: '#10b981', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

    // Wallpaper
    wallpaper: { flex: 1, position: 'relative' },
    wallpaperBg: { ...StyleSheet.absoluteFillObject, backgroundColor: '#e6eaf5' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
    loadingText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
    messageList: { paddingHorizontal: 10, paddingVertical: 16, paddingBottom: 8 },

    // Empty state
    emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
    emptyChatEmoji: { fontSize: 64, marginBottom: 12 },
    emptyChatTitle: { fontWeight: '800', fontSize: 18, color: '#1e293b' },
    emptyChatSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },

    // Date divider
    dateDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 14, paddingHorizontal: 20 },
    dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(99,102,241,0.15)' },
    datePill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.85)', marginHorizontal: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    dateText: { fontSize: 10, fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.8 },

    // Messages
    msgRow: { flexDirection: 'row', marginBottom: 3, alignItems: 'flex-end' },
    msgRowMe: { justifyContent: 'flex-end', paddingLeft: 48 },
    msgRowThem: { justifyContent: 'flex-start', paddingRight: 48 },
    avatarCol: { width: 32, marginRight: 6, alignItems: 'center', justifyContent: 'flex-end' },
    miniAvatar: { justifyContent: 'center', alignItems: 'center' },
    msgGroup: { maxWidth: '80%' },
    senderName: { fontSize: 10, fontWeight: '800', color: '#6366f1', marginBottom: 2, marginLeft: 12 },
    senderRole: { color: '#94a3b8', fontWeight: '500' },

    // Bubbles
    bubble: { borderRadius: 18, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4 },
    bubbleMe: { borderBottomRightRadius: 4, shadowColor: '#6366f1', shadowOpacity: 0.25 },
    bubbleThem: { borderBottomLeftRadius: 4 },
    bubbleGradient: { paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 6 },
    bubbleThemInner: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, paddingBottom: 6 },
    announcementLabel: { fontSize: 9, fontWeight: '900', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
    announcementLabelThem: { fontSize: 9, fontWeight: '900', color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
    msgTextMe: { fontSize: 14, color: '#fff', fontWeight: '500', lineHeight: 20 },
    msgTextThem: { fontSize: 14, color: '#0f172a', fontWeight: '500', lineHeight: 20 },
    msgMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 4 },
    msgTimeMe: { fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
    msgTimeThem: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },

    // Ticks
    tick: { width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
    spinnerRing: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderTopColor: '#fff' },
    tickRow: { flexDirection: 'row', alignItems: 'center' },
    tickChar: { fontSize: 11, fontWeight: '900', lineHeight: 14 },
    tickDouble: { fontSize: 11 },

    // Typing bubble
    typingContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 6, gap: 8 },
    typingBubble: { backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4, padding: 10, paddingHorizontal: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 },
    typingDotRow: { flexDirection: 'row', gap: 4, alignItems: 'center', height: 16 },
    typingDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#6366f1', opacity: 0.7 },
    typingLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },

    // Input bar
    inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 10, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    inputWrap: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#f8faff', borderRadius: 26, borderWidth: 1.5, borderColor: '#e2e8f0', paddingHorizontal: 6, paddingVertical: 4, gap: 4 },
    iconBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    iconText: { fontSize: 20 },
    textInput: { flex: 1, fontSize: 14, color: '#0f172a', fontWeight: '500', maxHeight: 120, paddingVertical: 6, paddingHorizontal: 4 },
    sendBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
    sendIcon: { color: '#fff', fontSize: 18, marginLeft: 2 },
    micBtn: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' },
    micIcon: { fontSize: 22 },
});
